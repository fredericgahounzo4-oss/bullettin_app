import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Capture un élément du DOM et le télécharge directement en PDF A4, une
 * seule page, sans passer par la boîte de dialogue d'impression du
 * navigateur. Le contenu est mis à l'échelle pour tenir entièrement sur
 * la page, comme le ferait une impression "ajuster à la page".
 */
export async function downloadElementAsPdf(element: HTMLElement, filename: string): Promise<void> {
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
  });
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  addCanvasAsPage(pdf, canvas);
  pdf.save(filename);
}

/**
 * Capture plusieurs éléments (un par élève, par ex.) et les regroupe dans un
 * seul PDF, une page par élément, téléchargé directement.
 *
 * Ces éléments sont souvent affichés dans une zone à défilement (ex. la fenêtre
 * "tous les bulletins d'une classe"). Capturer un élément qui n'est pas encore
 * pleinement visible/stabilisé dans cette zone peut produire une image tronquée
 * ou mal positionnée, donnant l'impression que les bulletins se chevauchent ou
 * se "collent" les uns aux autres dans le PDF final. On fait donc défiler chaque
 * élément en pleine vue et on laisse le navigateur stabiliser l'affichage avant
 * de le capturer.
 */
export async function downloadElementsAsPdf(elements: HTMLElement[], filename: string): Promise<void> {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  for (let i = 0; i < elements.length; i++) {
    const el = elements[i];
    el.scrollIntoView({ block: 'start' });
    // Deux passages par requestAnimationFrame laissent le temps au navigateur de
    // terminer le défilement et la mise en page avant la capture.
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    const canvas = await html2canvas(el, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
    });
    if (i > 0) pdf.addPage();
    addCanvasAsPage(pdf, canvas);
  }
  pdf.save(filename);
}

function addCanvasAsPage(pdf: jsPDF, canvas: HTMLCanvasElement) {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const imgWidthMm = pageWidth;
  const imgHeightMm = (canvas.height * imgWidthMm) / canvas.width;
  // Si le rendu est plus haut qu'une page A4, on le réduit pour qu'il
  // tienne entièrement dessus plutôt que de déborder sur une 2e page.
  const scaleToFit = imgHeightMm > pageHeight ? pageHeight / imgHeightMm : 1;
  const finalWidth = imgWidthMm * scaleToFit;
  const finalHeight = imgHeightMm * scaleToFit;
  const x = (pageWidth - finalWidth) / 2;
  const y = 0;
  const imgData = canvas.toDataURL('image/png');
  pdf.addImage(imgData, 'PNG', x, y, finalWidth, finalHeight);
}

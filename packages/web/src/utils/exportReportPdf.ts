/**
 * Export Report PDF utility
 * Converts report markdown/HTML to styled PDF with FundTracer branding
 */

export async function exportReportPdf(
  element: HTMLElement,
  filename: string,
  title?: string
): Promise<void> {
  const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ]);

  const canvas = await html2canvas(element, {
    backgroundColor: '#0d0d0d',
    scale: 2,
    logging: false,
    useCORS: true,
  });

  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
  const pageHeight = pdf.internal.pageSize.getHeight();

  let heightLeft = pdfHeight;
  let position = 0;

  // Add title if provided
  if (title) {
    pdf.setFontSize(16);
    pdf.setTextColor(255, 255, 255);
    pdf.text(title, pdfWidth / 2, 15, { align: 'center' });
    position = 20;
    heightLeft = pdfHeight - position;
  }

  // First page
  pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
  heightLeft -= pageHeight;

  // Multi-page if content overflows
  while (heightLeft > 0) {
    position = heightLeft - pdfHeight;
    pdf.addPage();
    pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
    heightLeft -= pageHeight;
  }

  pdf.save(filename);
}

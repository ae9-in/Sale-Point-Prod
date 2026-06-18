import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export const exportToPdf = async (title, description, elementId, filename) => {
  const originalElement = document.getElementById(elementId);
  if (!originalElement) return;

  const clone = originalElement.cloneNode(true);
  clone.style.overflow = 'visible';
  clone.style.width = 'max-content';
  clone.style.maxWidth = 'none';

  const wrapper = document.createElement('div');
  wrapper.setAttribute('data-theme', 'light');
  wrapper.style.padding = '30px';
  wrapper.style.background = '#ffffff'; 
  wrapper.style.color = '#0f172a';
  wrapper.style.width = 'max-content';
  wrapper.style.minWidth = '1000px';

  const header = document.createElement('div');
  header.style.marginBottom = '24px';
  header.style.borderBottom = '1px solid #e2e8f0';
  header.style.paddingBottom = '16px';
  header.innerHTML = `
    <h1 style="font-size: 24px; font-weight: 900; margin: 0 0 8px 0; color: #0f172a; text-transform: uppercase; letter-spacing: 0.05em; font-family: ui-sans-serif, system-ui, sans-serif;">${title}</h1>
    <p style="font-size: 12px; color: #475569; margin: 0; text-transform: uppercase; letter-spacing: 0.1em; font-weight: bold; font-family: ui-sans-serif, system-ui, sans-serif;">${description}</p>
    <p style="font-size: 10px; color: #64748b; margin-top: 12px; font-family: ui-sans-serif, system-ui, sans-serif;">Generated on: ${new Date().toLocaleString()}</p>
  `;
  
  wrapper.appendChild(header);
  wrapper.appendChild(clone);
  
  wrapper.style.position = 'absolute';
  wrapper.style.left = '-9999px';
  wrapper.style.top = '-9999px';
  document.body.appendChild(wrapper);

  // Fix internal scrolling elements to show full data
  const allElements = clone.querySelectorAll('*');
  allElements.forEach(el => {
    const style = window.getComputedStyle(el);
    if (style.overflow !== 'visible') el.style.setProperty('overflow', 'visible', 'important');
    if (style.overflowX !== 'visible') el.style.setProperty('overflow-x', 'visible', 'important');
    if (style.overflowY !== 'visible') el.style.setProperty('overflow-y', 'visible', 'important');
    if (style.maxHeight && style.maxHeight !== 'none') el.style.setProperty('max-height', 'none', 'important');
  });

  try {
    const canvas = await html2canvas(wrapper, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
    const imgData = canvas.toDataURL('image/png');
    
    const pdf = new jsPDF('l', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgHeight = (canvas.height * pdfWidth) / canvas.width;
    
    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position -= pageHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
      heightLeft -= pageHeight;
    }
    
    pdf.save(filename);
  } finally {
    document.body.removeChild(wrapper);
  }
};

export const exportToJpg = async (title, description, elementId, filename) => {
  const originalElement = document.getElementById(elementId);
  if (!originalElement) return;

  const clone = originalElement.cloneNode(true);
  clone.style.overflow = 'visible';
  clone.style.width = 'max-content';
  clone.style.maxWidth = 'none';

  const wrapper = document.createElement('div');
  wrapper.setAttribute('data-theme', 'light');
  wrapper.style.padding = '30px';
  wrapper.style.background = '#ffffff'; 
  wrapper.style.color = '#0f172a';
  wrapper.style.width = 'max-content';
  wrapper.style.minWidth = '1000px';

  const header = document.createElement('div');
  header.style.marginBottom = '24px';
  header.style.borderBottom = '1px solid #e2e8f0';
  header.style.paddingBottom = '16px';
  header.innerHTML = `
    <h1 style="font-size: 24px; font-weight: 900; margin: 0 0 8px 0; color: #0f172a; text-transform: uppercase; letter-spacing: 0.05em; font-family: ui-sans-serif, system-ui, sans-serif;">${title}</h1>
    <p style="font-size: 12px; color: #475569; margin: 0; text-transform: uppercase; letter-spacing: 0.1em; font-weight: bold; font-family: ui-sans-serif, system-ui, sans-serif;">${description}</p>
    <p style="font-size: 10px; color: #64748b; margin-top: 12px; font-family: ui-sans-serif, system-ui, sans-serif;">Generated on: ${new Date().toLocaleString()}</p>
  `;
  
  wrapper.appendChild(header);
  wrapper.appendChild(clone);
  
  wrapper.style.position = 'absolute';
  wrapper.style.left = '-9999px';
  wrapper.style.top = '-9999px';
  document.body.appendChild(wrapper);

  // Fix internal scrolling elements to show full data
  const allElements = clone.querySelectorAll('*');
  allElements.forEach(el => {
    const style = window.getComputedStyle(el);
    if (style.overflow !== 'visible') el.style.setProperty('overflow', 'visible', 'important');
    if (style.overflowX !== 'visible') el.style.setProperty('overflow-x', 'visible', 'important');
    if (style.overflowY !== 'visible') el.style.setProperty('overflow-y', 'visible', 'important');
    if (style.maxHeight && style.maxHeight !== 'none') el.style.setProperty('max-height', 'none', 'important');
  });

  try {
    const canvas = await html2canvas(wrapper, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
    const link = document.createElement('a');
    link.download = filename;
    link.href = canvas.toDataURL('image/jpeg', 0.95);
    link.click();
  } finally {
    document.body.removeChild(wrapper);
  }
};

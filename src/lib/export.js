import html2canvas from "html2canvas-pro";
import { jsPDF } from "jspdf";

const EXPORT_WIDTH = 1200;
const EXPORT_MARGIN_MM = 8;

function getExportScale() {
  return Math.min(3, Math.max(2, window.devicePixelRatio || 2));
}

function getThemeBackground() {
  return (
    getComputedStyle(document.documentElement).getPropertyValue("--color-base").trim() ||
    "#0c0d10"
  );
}

function injectExportStyles(clonedDoc) {
  const style = clonedDoc.createElement("style");
  style.textContent = `
    .export-capture--rendering {
      width: ${EXPORT_WIDTH}px !important;
      max-width: ${EXPORT_WIDTH}px !important;
      padding: 28px !important;
      background: var(--color-base) !important;
    }
    .export-capture--rendering .export-week-table {
      width: 100% !important;
      table-layout: fixed !important;
    }
    .export-capture--rendering .export-week-table th,
    .export-capture--rendering .export-week-table td {
      border-color: var(--color-border-soft) !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .export-capture--rendering .export-month-names {
      display: flex !important;
      flex-direction: column !important;
      gap: 2px !important;
    }
    .export-capture--rendering .export-month-cell {
      min-height: 88px !important;
    }
    .export-capture--rendering button {
      cursor: default !important;
    }
    .export-capture--rendering .export-skip {
      display: none !important;
    }
    .export-capture--rendering .week-needs-mobile {
      display: none !important;
    }
    .export-capture--rendering .week-schedule-table-wrap {
      display: block !important;
    }
  `;
  clonedDoc.head.appendChild(style);
}

async function captureNode(node, { title } = {}) {
  const backgroundColor = getThemeBackground();

  return html2canvas(node, {
    backgroundColor,
    scale: getExportScale(),
    useCORS: true,
    logging: false,
    width: EXPORT_WIDTH,
    windowWidth: EXPORT_WIDTH,
    onclone: (clonedDoc, element) => {
      element.classList.add("export-capture--rendering");
      element.style.width = `${EXPORT_WIDTH}px`;
      element.style.maxWidth = `${EXPORT_WIDTH}px`;
      if (title) element.dataset.exportTitle = title;
      injectExportStyles(clonedDoc);
    },
  });
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Captura um elemento DOM e baixa como PNG em alta resolução.
 */
export async function exportNodeAsImage(node, filename = "escala.png", options = {}) {
  const canvas = await captureNode(node, options);

  await new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Falha ao gerar imagem PNG"));
        return;
      }
      downloadBlob(blob, filename);
      resolve();
    }, "image/png");
  });
}

/**
 * Captura um elemento DOM e baixa como PDF (A4, orientação automática).
 */
export async function exportNodeAsPdf(node, filename = "escala.pdf", options = {}) {
  const canvas = await captureNode(node, options);
  const imgData = canvas.toDataURL("image/png", 1);

  const orientation = canvas.width >= canvas.height ? "landscape" : "portrait";
  const pdf = new jsPDF({ orientation, unit: "mm", format: "a4", compress: true });

  if (options.title) {
    pdf.setProperties({ title: options.title, creator: "EasyScale" });
  }

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = EXPORT_MARGIN_MM;
  const maxWidth = pageWidth - margin * 2;
  const maxHeight = pageHeight - margin * 2;

  const imgRatio = canvas.width / canvas.height;
  let imgWidth = maxWidth;
  let imgHeight = imgWidth / imgRatio;

  if (imgHeight > maxHeight) {
    imgHeight = maxHeight;
    imgWidth = imgHeight * imgRatio;
  }

  const x = (pageWidth - imgWidth) / 2;
  const y = (pageHeight - imgHeight) / 2;

  pdf.addImage(imgData, "PNG", x, y, imgWidth, imgHeight, undefined, "FAST");
  pdf.save(filename);
}

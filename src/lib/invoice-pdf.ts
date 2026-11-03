import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";

export type InvoicePdfInput = {
  organization: {
    name: string;
    email: string | null;
    phone: string | null;
    website: string | null;
    address: string | null;
    city: string | null;
    country: string | null;
  };
  client: {
    name: string;
    company: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
    city: string | null;
    country: string | null;
  };
  invoice: {
    invoiceNumber: string;
    status: string;
    issueDate: Date | null;
    dueDate: Date | null;
    subtotal: string | null;
    taxRate: string | null;
    taxAmount: string | null;
    discount: string | null;
    total: string | null;
    currency: string | null;
    notes: string | null;
    terms: string | null;
    lineItems: unknown;
  };
};

type LineItem = {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
};

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 50;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

const DARK = rgb(0.12, 0.16, 0.24);
const MUTED = rgb(0.42, 0.45, 0.5);
const BORDER = rgb(0.85, 0.87, 0.9);
const ACCENT = rgb(0.49, 0.23, 0.93);
const LIGHT = rgb(0.96, 0.97, 0.99);
const WHITE = rgb(1, 1, 1);

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/,/g, ""));
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function parseLineItems(value: unknown): LineItem[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    .slice(0, 100)
    .map((item) => {
      const quantity = toNumber(item.quantity, 1);
      const unitPrice = toNumber(item.unitPrice ?? item.price, 0);
      const amount = toNumber(item.total ?? item.amount, quantity * unitPrice);

      return {
        description: typeof item.description === "string" ? item.description : "Item",
        quantity,
        unitPrice,
        amount,
      };
    });
}

function formatMoney(value: number, currency: string): string {
  const amount = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

  return `${currency} ${amount}`;
}

function formatQuantity(value: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);
}

function formatDate(value: Date | null): string {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function wrapText(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number
): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [""];

  const words = clean.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      current = candidate;
      continue;
    }

    if (current) lines.push(current);
    current = word;
  }

  if (current) lines.push(current);
  return lines.length > 0 ? lines : [""];
}

export async function renderInvoicePdf(input: InvoicePdfInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const { organization, client, invoice } = input;
  const currency = (invoice.currency || "ETB").toUpperCase();
  const items = parseLineItems(invoice.lineItems);

  let page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  const colRightX = PAGE_WIDTH - MARGIN;

  const text = (
    value: string,
    x: number,
    baseline: number,
    size: number,
    typeface: PDFFont,
    color = DARK
  ) => {
    page.drawText(value, { x, y: baseline, size, font: typeface, color });
  };

  const right = (
    value: string,
    rightX: number,
    baseline: number,
    size: number,
    typeface: PDFFont,
    color = DARK
  ) => {
    page.drawText(value, {
      x: rightX - typeface.widthOfTextAtSize(value, size),
      y: baseline,
      size,
      font: typeface,
      color,
    });
  };

  const newPage = () => {
    page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    y = PAGE_HEIGHT - MARGIN;
  };

  const ensureSpace = (needed: number) => {
    if (y - needed < MARGIN) newPage();
  };

  // ── Header ───────────────────────────────────────────────────────────────
  const headerBaseline = y;
  text(organization.name, MARGIN, headerBaseline, 19, bold);
  right("INVOICE", colRightX, headerBaseline - 1, 24, bold, ACCENT);

  let leftY = headerBaseline - 18;
  const contact = [organization.email, organization.phone, organization.website]
    .filter(Boolean)
    .join("  ·  ");
  if (contact) {
    text(contact, MARGIN, leftY, 9, font, MUTED);
    leftY -= 13;
  }

  const addressParts = [
    organization.address,
    [organization.city, organization.country].filter(Boolean).join(", "),
  ].filter(Boolean);
  if (addressParts.length > 0) {
    for (const line of wrapText(addressParts.join(" · "), font, 9, 260)) {
      text(line, MARGIN, leftY, 9, font, MUTED);
      leftY -= 12;
    }
  }

  let rightY = headerBaseline - 22;
  text(invoice.invoiceNumber, colRightX - bold.widthOfTextAtSize(invoice.invoiceNumber, 10), rightY, 10, bold);
  rightY -= 14;
  right(
    `Status: ${invoice.status.replace(/_/g, " ")}`,
    colRightX,
    rightY,
    9,
    font,
    MUTED
  );

  y = Math.min(leftY, rightY) - 16;
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: colRightX, y },
    thickness: 1,
    color: BORDER,
  });
  y -= 26;

  // ── Billing / invoice details ────────────────────────────────────────────
  const detailsX = 360;
  const blockTop = y;

  text("BILL TO", MARGIN, blockTop, 8, bold, ACCENT);
  let billY = blockTop - 16;
  text(client.name, MARGIN, billY, 11, bold);
  billY -= 14;

  const clientLines = [
    client.company,
    client.email,
    client.phone,
    client.address,
    [client.city, client.country].filter(Boolean).join(", "),
  ].filter((line): line is string => Boolean(line));

  for (const line of clientLines) {
    for (const wrapped of wrapText(line, font, 9, 240)) {
      text(wrapped, MARGIN, billY, 9, font, MUTED);
      billY -= 12;
    }
  }

  text("INVOICE DETAILS", detailsX, blockTop, 8, bold, ACCENT);
  let detailY = blockTop - 16;
  const details: Array<[string, string]> = [
    ["Issue date", formatDate(invoice.issueDate)],
    ["Due date", formatDate(invoice.dueDate)],
    ["Currency", currency],
  ];

  for (const [label, value] of details) {
    text(label, detailsX, detailY, 9, font, MUTED);
    right(value, colRightX, detailY, 9, font, DARK);
    detailY -= 14;
  }

  y = Math.min(billY, detailY) - 18;

  // ── Line items ───────────────────────────────────────────────────────────
  const qtyRight = colRightX - 190;
  const unitRight = colRightX - 100;
  const amountRight = colRightX;
  const descX = MARGIN + 6;
  const descWidth = qtyRight - descX - 40;

  const drawTableHeader = () => {
    ensureSpace(28);
    const height = 22;
    page.drawRectangle({
      x: MARGIN,
      y: y - height,
      width: CONTENT_WIDTH,
      height,
      color: DARK,
    });
    const baseline = y - 15;
    text("DESCRIPTION", descX, baseline, 8, bold, WHITE);
    right("QTY", qtyRight, baseline, 8, bold, WHITE);
    right("UNIT PRICE", unitRight, baseline, 8, bold, WHITE);
    right("AMOUNT", amountRight, baseline, 8, bold, WHITE);
    y -= height;
  };

  drawTableHeader();

  if (items.length === 0) {
    const height = 26;
    ensureSpace(height);
    text("No line items", descX, y - 16, 9, font, MUTED);
    y -= height;
  }

  items.forEach((item, index) => {
    const descriptionLines = wrapText(item.description || "Item", font, 9, descWidth);
    const rowHeight = Math.max(26, descriptionLines.length * 12 + 12);

    if (y - rowHeight < MARGIN) {
      newPage();
      drawTableHeader();
    }

    if (index % 2 === 1) {
      page.drawRectangle({
        x: MARGIN,
        y: y - rowHeight,
        width: CONTENT_WIDTH,
        height: rowHeight,
        color: LIGHT,
      });
    }

    const baseline = y - 16;
    descriptionLines.forEach((line, lineIndex) => {
      text(line, descX, baseline - lineIndex * 12, 9, font, DARK);
    });
    right(formatQuantity(item.quantity), qtyRight, baseline, 9, font, DARK);
    right(formatMoney(item.unitPrice, currency), unitRight, baseline, 9, font, DARK);
    right(formatMoney(item.amount, currency), amountRight, baseline, 9, font, DARK);

    y -= rowHeight;
    page.drawLine({
      start: { x: MARGIN, y },
      end: { x: colRightX, y },
      thickness: 0.5,
      color: BORDER,
    });
  });

  // ── Totals ───────────────────────────────────────────────────────────────
  const subtotal = toNumber(invoice.subtotal);
  const taxRate = toNumber(invoice.taxRate);
  const taxAmount = toNumber(invoice.taxAmount);
  const discount = toNumber(invoice.discount);
  const total =
    toNumber(invoice.total, 0) || Math.max(0, subtotal + taxAmount - discount);

  ensureSpace(150);
  const totalsLabelX = colRightX - 230;
  let totalY = y - 24;

  const drawTotal = (label: string, value: string, emphasis = false) => {
    text(label, totalsLabelX, totalY, emphasis ? 11 : 9, emphasis ? bold : font, emphasis ? DARK : MUTED);
    right(value, colRightX, totalY, emphasis ? 11 : 9, emphasis ? bold : font, DARK);
    totalY -= emphasis ? 22 : 16;
  };

  drawTotal("Subtotal", formatMoney(subtotal, currency));
  drawTotal(`Tax (${taxRate}%)`, formatMoney(taxAmount, currency));
  drawTotal("Discount", `- ${formatMoney(discount, currency)}`);

  page.drawLine({
    start: { x: totalsLabelX, y: totalY + 10 },
    end: { x: colRightX, y: totalY + 10 },
    thickness: 0.8,
    color: BORDER,
  });
  drawTotal(`TOTAL (${currency})`, formatMoney(total, currency), true);
  y = totalY - 8;

  // ── Notes / terms ────────────────────────────────────────────────────────
  const drawSection = (title: string, value: string | null) => {
    if (!value) return;

    ensureSpace(50);
    y -= 8;
    text(title, MARGIN, y, 8, bold, ACCENT);
    y -= 15;
    for (const line of wrapText(value, font, 9, CONTENT_WIDTH)) {
      ensureSpace(14);
      text(line, MARGIN, y, 9, font, MUTED);
      y -= 12;
    }
  };

  drawSection("NOTES", invoice.notes);
  drawSection("TERMS", invoice.terms);

  return doc.save();
}

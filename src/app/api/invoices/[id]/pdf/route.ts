import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { clients, invoices, organizations } from "@/db/schema";
import { requireApiUser } from "@/lib/auth";
import { renderInvoicePdf } from "@/lib/invoice-pdf";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const idSchema = z.string().uuid();

type RouteContext = { params: Promise<{ id: string }> };

function safeFilename(invoiceNumber: string): string {
  const cleaned = invoiceNumber.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
  return cleaned || "invoice";
}

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const auth = await requireApiUser();
    if (!auth.ok) return auth.response;

    const { id } = await context.params;
    if (!idSchema.safeParse(id).success) {
      return NextResponse.json({ error: "Invalid invoice id" }, { status: 400 });
    }

    const [row] = await db
      .select({
        invoiceNumber: invoices.invoiceNumber,
        status: invoices.status,
        issueDate: invoices.issueDate,
        dueDate: invoices.dueDate,
        subtotal: invoices.subtotal,
        taxRate: invoices.taxRate,
        taxAmount: invoices.taxAmount,
        discount: invoices.discount,
        total: invoices.total,
        currency: invoices.currency,
        notes: invoices.notes,
        terms: invoices.terms,
        lineItems: invoices.lineItems,
        clientName: clients.name,
        clientCompany: clients.company,
        clientEmail: clients.email,
        clientPhone: clients.phone,
        clientAddress: clients.address,
        clientCity: clients.city,
        clientCountry: clients.country,
        orgName: organizations.name,
        orgEmail: organizations.email,
        orgPhone: organizations.phone,
        orgWebsite: organizations.website,
        orgAddress: organizations.address,
        orgCity: organizations.city,
        orgCountry: organizations.country,
      })
      .from(invoices)
      .innerJoin(clients, eq(invoices.clientId, clients.id))
      .innerJoin(organizations, eq(invoices.organizationId, organizations.id))
      .where(
        and(
          eq(invoices.id, id),
          eq(invoices.organizationId, auth.user.organizationId)
        )
      )
      .limit(1);

    if (!row) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const bytes = await renderInvoicePdf({
      organization: {
        name: row.orgName,
        email: row.orgEmail,
        phone: row.orgPhone,
        website: row.orgWebsite,
        address: row.orgAddress,
        city: row.orgCity,
        country: row.orgCountry,
      },
      client: {
        name: row.clientName,
        company: row.clientCompany,
        email: row.clientEmail,
        phone: row.clientPhone,
        address: row.clientAddress,
        city: row.clientCity,
        country: row.clientCountry,
      },
      invoice: {
        invoiceNumber: row.invoiceNumber,
        status: row.status,
        issueDate: row.issueDate,
        dueDate: row.dueDate,
        subtotal: row.subtotal,
        taxRate: row.taxRate,
        taxAmount: row.taxAmount,
        discount: row.discount,
        total: row.total,
        currency: row.currency,
        notes: row.notes,
        terms: row.terms,
        lineItems: row.lineItems,
      },
    });

    return new NextResponse(bytes as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="invoice-${safeFilename(row.invoiceNumber)}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("Invoice PDF GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

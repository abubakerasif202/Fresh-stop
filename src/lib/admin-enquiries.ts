import type { Prisma } from "@prisma/client";
import { AdminHttpError, recordAudit } from "./admin-audit";
import { db } from "./db";

export const ENQUIRY_STATUSES = ["NEW", "CONTACTED", "CLOSED"] as const;
export const ENQUIRY_KIND_VALUES = ["WHOLESALE", "CONTACT"] as const;
export const ENQUIRY_PAGE_SIZE = 25;

export type EnquiryStatusValue = (typeof ENQUIRY_STATUSES)[number];

export const pickOf = <T extends string>(list: readonly T[], value: string | null | undefined): T | undefined =>
  list.find((item) => item === value);

export interface EnquiryListFilters {
  kind?: (typeof ENQUIRY_KIND_VALUES)[number];
  status?: EnquiryStatusValue;
  page: number;
}

const LIST_SELECT = {
  id: true, kind: true, name: true, businessName: true, email: true, phone: true, products: true,
  estimatedQuantity: true, message: true, status: true, emailSentAt: true, createdAt: true
} satisfies Prisma.EnquirySelect;

/** ipHash is deliberately never selected: it is for abuse investigation in the database only. */
export async function listEnquiries(filters: EnquiryListFilters) {
  const where: Prisma.EnquiryWhereInput = { ...(filters.kind ? { kind: filters.kind } : {}), ...(filters.status ? { status: filters.status } : {}) };
  const [enquiries, total] = await Promise.all([
    db.enquiry.findMany({ where, orderBy: { createdAt: "desc" }, skip: (filters.page - 1) * ENQUIRY_PAGE_SIZE, take: ENQUIRY_PAGE_SIZE, select: LIST_SELECT }),
    db.enquiry.count({ where })
  ]);
  return { enquiries, page: filters.page, pageSize: ENQUIRY_PAGE_SIZE, total };
}

/** Changes status and writes the audit row in one transaction. */
export async function setEnquiryStatus(id: string, status: EnquiryStatusValue, admin: string) {
  return db.$transaction(async (tx) => {
    const before = await tx.enquiry.findUnique({ where: { id }, select: { id: true, status: true } });
    if (!before) throw new AdminHttpError(404, "Enquiry not found.");
    const updated = await tx.enquiry.update({ where: { id }, data: { status }, select: { id: true, status: true } });
    await recordAudit(tx, { action: "ENQUIRY_STATUS", entityType: "Enquiry", entityId: id, before: { status: before.status }, after: { status }, admin });
    return updated;
  });
}

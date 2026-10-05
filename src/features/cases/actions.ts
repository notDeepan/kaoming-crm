'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { casePriorities, caseStatuses, caseTypes, messageDirections } from '@/db/enums';
import { addCaseMessage, markCaseMessageSent, openCase, reviewCaseTranslation,
  transitionCase } from './service';

const uuid = z.string().uuid();
async function run(caseId: string, work: () => Promise<unknown>, notice: string) {
  try { await work(); }
  catch (error) { redirect(`/cases/${caseId}?error=${encodeURIComponent(error instanceof Error ? error.message : 'Case action failed')}`); }
  revalidatePath(`/cases/${caseId}`);
  redirect(`/cases/${caseId}?notice=${encodeURIComponent(notice)}`);
}

export async function openCaseAction(form: FormData) {
  try {
    const row = await openCase({
      partnerId: uuid.parse(form.get('partnerId')),
      machineId: form.get('machineId') ? uuid.parse(form.get('machineId')) : null,
      caseType: z.enum(caseTypes).parse(form.get('caseType')),
      priority: z.enum(casePriorities).parse(form.get('priority')),
      subject: z.string().trim().min(1).max(500).parse(form.get('subject')),
    });
    revalidatePath('/cases');
    redirect(`/cases/${row.id}?notice=Case%20opened`);
  } catch (error) {
    if (error && typeof error === 'object' && 'digest' in error) throw error;
    redirect(`/cases?error=${encodeURIComponent(error instanceof Error ? error.message : 'Case could not be opened')}`);
  }
}
export async function addCaseMessageAction(form: FormData) {
  const caseId = uuid.parse(form.get('caseId'));
  await run(caseId, () => addCaseMessage(caseId, {
    direction: z.enum(messageDirections).parse(form.get('direction')),
    sourceLanguage: z.enum(['en', 'zh-Hant']).parse(form.get('sourceLanguage')),
    sourceText: z.string().min(1).max(20_000).parse(form.get('sourceText')),
  }), 'Message recorded');
}
export async function reviewTranslationAction(form: FormData) {
  const caseId = uuid.parse(form.get('caseId'));
  await run(caseId, () => reviewCaseTranslation(uuid.parse(form.get('messageId')), {
    translatedText: z.string().trim().min(1).max(20_000).parse(form.get('translatedText')),
    source: z.literal('human').parse(form.get('source')),
  }), 'Translation reviewed');
}
export async function markMessageSentAction(form: FormData) {
  const caseId = uuid.parse(form.get('caseId'));
  await run(caseId, () => markCaseMessageSent(uuid.parse(form.get('messageId'))), 'Outbound message marked sent');
}
export async function transitionCaseAction(form: FormData) {
  const caseId = uuid.parse(form.get('caseId'));
  await run(caseId, () => transitionCase(caseId, z.enum(caseStatuses).parse(form.get('target')),
    z.string().trim().max(5000).parse(form.get('resolution') ?? '')), 'Case state changed');
}

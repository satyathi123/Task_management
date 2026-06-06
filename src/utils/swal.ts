/**
 * swal.ts — Centralized SweetAlert2 helper functions.
 *
 * Usage: import { confirmDelete, showSuccess, showWarning, showInfo } from '../utils/swal';
 *
 * All raw Swal.fire calls should live here so that the brand colours,
 * button labels, and UX patterns stay consistent across the entire app.
 * Individual pages/components should import these helpers instead of
 * calling Swal.fire directly.
 */

import Swal, { SweetAlertResult } from 'sweetalert2';

// ─── Brand colours ────────────────────────────────────────────────────────────
const PRIMARY = '#6366f1';   // indigo — confirm / info
const DANGER  = '#ef4444';   // red    — destructive confirm
const NEUTRAL = '#6b7280';   // grey   — cancel buttons

// ─── Confirm dialogs (returns true when user clicks the confirm button) ───────

/**
 * Generic delete confirmation.
 * @param itemLabel  Optional label shown in bold, e.g. '"My Test"'
 */
export async function confirmDelete(itemLabel?: string): Promise<boolean> {
  const html = itemLabel
    ? `Are you sure you want to delete<br/><strong>${itemLabel}</strong>?`
    : 'Are you sure you want to delete this item?';

  const result: SweetAlertResult = await Swal.fire({
    title: 'Delete?',
    html,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Yes, Delete',
    cancelButtonText: 'Cancel',
    confirmButtonColor: DANGER,
    cancelButtonColor: NEUTRAL,
    reverseButtons: true,
    focusCancel: true,
  });
  return result.isConfirmed;
}

/**
 * "Clear / Reset" confirmation (e.g. clear all question edits).
 */
export async function confirmClear(
  title = 'Clear All Edits?',
  text = 'This will reset all content. This action cannot be undone.',
): Promise<boolean> {
  const result: SweetAlertResult = await Swal.fire({
    title,
    text,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Yes, Clear All',
    cancelButtonText: 'Cancel',
    confirmButtonColor: DANGER,
    cancelButtonColor: NEUTRAL,
    reverseButtons: true,
  });
  return result.isConfirmed;
}

// ─── Informational dialogs ────────────────────────────────────────────────────

/**
 * Success toast — auto-closes after `timer` ms (default 2 500 ms).
 */
export function showSuccess(
  title: string,
  text?: string,
  timer = 2500,
): void {
  Swal.fire({
    title,
    text,
    icon: 'success',
    confirmButtonColor: PRIMARY,
    timer,
    timerProgressBar: true,
  });
}

/**
 * Warning / cannot-proceed dialog (non-blocking, single OK button).
 */
export function showWarning(title: string, text: string): void {
  Swal.fire({
    title,
    text,
    icon: 'warning',
    confirmButtonColor: PRIMARY,
  });
}

/**
 * Informational dialog — supports HTML content.
 */
export function showInfo(title: string, html: string): void {
  Swal.fire({
    title,
    html,
    icon: 'info',
    confirmButtonColor: PRIMARY,
  });
}

/**
 * Confirm dialog for replacing existing content (e.g. CSV import).
 */
export async function confirmReplace(
  title: string,
  html: string,
): Promise<boolean> {
  const result: SweetAlertResult = await Swal.fire({
    title,
    html,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Yes, Import',
    cancelButtonText: 'Cancel',
    confirmButtonColor: PRIMARY,
    cancelButtonColor: NEUTRAL,
    reverseButtons: true,
  });
  return result.isConfirmed;
}

/**
 * Publish-success modal — awaitable so the caller can navigate after it closes.
 */
export async function showPublishSuccess(): Promise<void> {
  await Swal.fire({
    title: '🎉 Published!',
    text: 'Congratulations! The test has been successfully published and is now live.',
    icon: 'success',
    confirmButtonText: 'Go to Dashboard',
    confirmButtonColor: PRIMARY,
    timer: 3000,
    timerProgressBar: true,
  });
}

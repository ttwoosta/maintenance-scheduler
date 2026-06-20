import { Pipe, PipeTransform, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

/**
 * Marks a trusted inline-SVG string as safe for `[innerHTML]`.
 *
 * Angular's default HTML sanitizer strips `<svg>`, so icon markup bound through
 * `[innerHTML]` would otherwise render empty. Only use this on markup you author
 * (the static icon strings here) — never on user input.
 */
@Pipe({ name: 'safeHtml' })
export class SafeHtmlPipe implements PipeTransform {
  private readonly sanitizer = inject(DomSanitizer);
  transform(value: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(value);
  }
}

import { AfterViewInit, Directive, ElementRef, inject } from '@angular/core';

/**
 * Focuses (and selects, for inputs) the host element once it enters the DOM.
 * Used by inline grid-cell editors so a freshly opened cell is ready to type.
 */
@Directive({
  selector: '[appAutofocus]',
})
export class AutofocusDirective implements AfterViewInit {
  private readonly el = inject(ElementRef<HTMLElement>);

  ngAfterViewInit() {
    const node = this.el.nativeElement as HTMLElement & { select?: () => void };
    node.focus();
    try {
      node.select?.();
    } catch {
      /* not a text field */
    }
  }
}

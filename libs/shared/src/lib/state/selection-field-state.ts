import { afterNextRender, ChangeDetectorRef, DestroyRef, inject, Injector } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { AbstractControl } from '@angular/forms';
import { FormGroupDirective, NgControl, Validators } from '@angular/forms';
import type { ErrorStateMatcher } from '@angular/material/core';

export function selectionFieldState(control: AbstractControl): { matcher: ErrorStateMatcher; required: () => boolean } {
  const injector = inject(Injector);
  const changeDetector = inject(ChangeDetectorRef);
  const destroyRef = inject(DestroyRef);
  const form = inject(FormGroupDirective, { optional: true, skipSelf: true });
  // Resolve the outer control lazily, after its value accessor has been initialized.
  const outer = (): AbstractControl | null => injector.get(NgControl, null, { self: true })?.control ?? null;

  afterNextRender(() => {
    outer()
      ?.events.pipe(takeUntilDestroyed(destroyRef))
      .subscribe(() => changeDetector.markForCheck());
  });

  return {
    matcher: {
      isErrorState: () => {
        const parent = outer();

        return (
          !control.disabled &&
          !!(
            (parent?.invalid && (parent.touched || form?.submitted)) ||
            (control.invalid && (control.touched || form?.submitted))
          )
        );
      },
    },
    required: () => outer()?.hasValidator(Validators.required) ?? false,
  };
}

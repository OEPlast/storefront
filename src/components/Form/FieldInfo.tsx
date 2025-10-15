import type { AnyFieldApi } from '@tanstack/react-form';

interface FieldInfoProps {
  field: AnyFieldApi;
}

/**
 * FieldInfo Component
 * 
 * Displays validation errors and loading states for form fields.
 * 
 * @example
 * ```tsx
 * import { FieldInfo } from '@/components/Form/FieldInfo';
 * 
 * <form.Field
 *   name="email"
 *   children={(field) => {
 *     const hasError = field.state.meta.isTouched && !field.state.meta.isValid;
 *     
 *     return (
 *       <div>
 *         <input
 *           className={`border-line px-4 pt-3 pb-3 w-full rounded-lg ${
 *             hasError ? 'border-red-600' : ''
 *           }`}
 *           value={field.state.value}
 *           onBlur={field.handleBlur}
 *           onChange={(e) => field.handleChange(e.target.value)}
 *         />
 *         <FieldInfo field={field} />
 *       </div>
 *     );
 *   }}
 * />
 * ```
 */
export function FieldInfo({ field }: FieldInfoProps) {
  return (
    <>
      {field.state.meta.isTouched && !field.state.meta.isValid ? (
        <em className="mt-1 block text-sm text-red">
          {field.state.meta.errors[0]?.message}
        </em>
      ) : null}
      {field.state.meta.isValidating ? (
        <span className="mt-1 block text-sm text-gray-500">Validating...</span>
      ) : null}
    </>
  );
}

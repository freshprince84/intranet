# Rules for vibe coding

## 🚨 STRENGSTENS VERBOTEN: Vermutungen bei Analysen und Planungen

**⚠️ ABSOLUTE REGEL - KEINE AUSNAHMEN:**
- **VERMUTUNGEN SIND STRENGSTENS VERBOTEN** bei allen Analysen, Planungen und Dokumentationen
- **KEIN Konjunktiv** (sollte, könnte, würde, müsste, etc.)
- **KEINE Vermutungen** (vielleicht, evtl., möglicherweise, vermutlich, etc.)
- **KEINE Schätzungen** ohne konkrete Fakten
- **NUR FAKTEN** - Nur das dokumentieren, was tatsächlich im Code steht oder nachweisbar ist

**Was bedeutet das konkret:**
- Code genau untersuchen und nur dokumentieren, was tatsächlich vorhanden ist
- Keine Formulierungen wie "xy sollte gemacht werden" oder "könnte verbessert werden"
- Keine Formulierungen wie "evtl. ist xy das Problem" oder "vielleicht sollte xy untersucht werden"
- In Planungsdokumenten nur das reinschreiben, was effektiv gemacht werden soll
- Nicht Dinge wie "xy untersuchen" - entweder untersuchen und Fakten dokumentieren, oder beim User nachfragen
- Falls die Anweisung nicht klar ist: **IMMER beim User nachfragen**, statt zu vermuten!

**Beispiele:**
- ❌ **FALSCH:** "Die Funktion könnte langsamer sein" → ✅ **RICHTIG:** "Die Funktion benötigt 2.5 Sekunden (gemessen)"
- ❌ **FALSCH:** "Evtl. sollte hier ein Cache verwendet werden" → ✅ **RICHTIG:** "Die Funktion wird 100x pro Sekunde aufgerufen, Cache würde X% Performance verbessern"
- ❌ **FALSCH:** "Das Problem sollte in Datei X liegen" → ✅ **RICHTIG:** "In Datei X, Zeile Y, steht Code Z, der Problem P verursacht"

## Code structure & organization

- **Keep code DRY (Don't Repeat Yourself)**
  - Extract repeated logic into reusable functions
  - Create utility functions for common operations (validation, formatting, etc.)
  - Use shared components for UI patterns that appear multiple times

- **Break down large files**
  - Split files larger than 300-400 lines into smaller modules
  - Separate concerns: data fetching, business logic, UI rendering
  - Create focused components that do one thing well

- **Use logical file organization**
  - Group related files by feature or domain
  - Create separate directories for components, utilities, services, etc.
  - Follow consistent naming conventions across the project

## Security practices

- **Input validation and sanitization**
  - Validate all user inputs on both client and server sides
  - Use parameterized queries for database operations
  - Sanitize any data before rendering it to prevent XSS attacks

- **Authentication & authorization**
  - Protect sensitive routes with authentication middleware
  - Implement proper authorization checks for data access
  - Use role-based permissions for different user types

- **API security**
  - Implement rate limiting on authentication endpoints
  - Set secure HTTP headers (CORS, Content-Security-Policy)
  - Use HTTPS for all connections

- **Secrets management**
  - Never hardcode secrets or credentials in source code
  - Store sensitive values in environment variables
  - Use secret management services for production environments

## Error handling

- **Implement comprehensive error handling**
  - Catch and handle specific error types differently
  - Log errors with sufficient context for debugging
  - Present user-friendly error messages in the UI

- **Handle async operations properly**
  - Use try/catch blocks with async/await
  - Handle network failures gracefully
  - Implement loading states for better user experience

## Performance optimization

- **Minimize expensive operations**
  - Cache results of costly calculations
  - Use memoization for pure functions
  - Implement pagination for large data sets

- **Prevent memory leaks**
  - Clean up event listeners and subscriptions
  - Cancel pending requests when components unmount
  - Clear intervals and timeouts when no longer needed

- **Optimize rendering**
  - Avoid unnecessary re-renders
  - Use virtualization for long lists
  - Implement code splitting and lazy loading

## Database best practices

- **Use transactions for related operations**
  - Wrap related database operations in transactions
  - Ensure data consistency across multiple operations
  - Implement proper rollback mechanisms

- **Optimize queries**
  - Create indexes for frequently queried fields
  - Select only the fields you need
  - Use query pagination when fetching large datasets

- **Handle database connections properly**
  - Use connection pools
  - Close connections when operations complete
  - Implement retry mechanisms for transient failures

## API design

- **Follow RESTful principles**
  - Use appropriate HTTP methods (GET, POST, PUT, DELETE)
  - Return consistent response formats
  - Use meaningful HTTP status codes

- **Design clear endpoints**
  - Organize endpoints by resource
  - Version your API
  - Document all endpoints with examples

- **Implement proper error responses**
  - Return structured error objects
  - Include error codes and helpful messages
  - Maintain detailed logs of API errors

## Maintainability

- **Use clear naming**
  - Choose descriptive variable, function, and class names
  - Avoid abbreviations and cryptic naming
  - Use consistent naming patterns throughout the codebase

- **Add documentation**
  - Document complex functions with clear descriptions
  - Explain the "why" not just the "what"
  - Keep documentation up-to-date when code changes

- **Write tests**
  - Cover critical business logic with unit tests
  - Write integration tests for important flows
  - Implement end-to-end tests for critical user journeys

## Frontend specific

- **Implement form validation**
  - Validate input as users type
  - Provide clear error messages
  - Handle form submission errors gracefully

- **Use proper state management**
  - Choose appropriate state management for your app's complexity
  - Avoid prop drilling through many component levels
  - Keep state as close as possible to where it's needed

- **Ensure accessibility**
  - Use semantic HTML elements
  - Add proper ARIA attributes for complex elements
  - Ensure keyboard navigability
  - Maintain sufficient color contrast

- **Spacing Standards**
  - Use `space-y-4` (16px) for vertical spacing in lists/containers with flex column layout
  - Use `gap-4` (16px) for grid layouts
  - **IMPORTANT:** Do NOT add additional `mb-*` (margin-bottom) classes on child elements when parent uses `space-y-*`
  - This prevents double spacing (e.g., `space-y-4` + `mb-4` = 32px instead of 16px)
  - Standard spacing: `space-y-4` for vertical lists, `gap-4` for grids

## Security vulnerabilities to prevent

- **SQL/NoSQL injection**
  - Never concatenate user input directly into queries
  - Use parameterized queries or ORM methods

- **Cross-site scripting (XSS)**
  - Sanitize user input before displaying it
  - Use frameworks' built-in protection mechanisms

- **Cross-site request forgery (CSRF)**
  - Implement anti-CSRF tokens
  - Validate request origins

- **Broken authentication**
  - Implement proper session management
  - Use secure password hashing
  - Enforce strong password policies

## Internationalization (i18n) - CRITICAL

**⚠️ MANDATORY: Translations are PART OF THE IMPLEMENTATION, not optional!**

- **Every new feature MUST have translations in ALL languages (de, en, es)**
- **NO hardcoded text in components** - Always use `t()` function
- **Test in all 3 languages** before committing

**Before implementing ANY new feature:**
1. Identify ALL texts that will be displayed
2. Add translation keys to `de.json` (German as base)
3. Add translation keys to `en.json` (English)
4. Add translation keys to `es.json` (Spanish)
5. Replace ALL hardcoded texts with `t()` calls
6. Test in all 3 languages

**Standard usage:**
```tsx
// ✅ CORRECT
const { t } = useTranslation();
<h2>{t('featureName.title', { defaultValue: 'Title' })}</h2>

// ❌ WRONG - Hardcoded text
<h2>Title</h2>
```

**Translation files:**
- `frontend/src/i18n/locales/de.json`
- `frontend/src/i18n/locales/en.json`
- `frontend/src/i18n/locales/es.json`

**See also:**
- [CODING_STANDARDS.md](CODING_STANDARDS.md) - Full translation rules
- [IMPLEMENTATION_CHECKLIST.md](IMPLEMENTATION_CHECKLIST.md) - Implementation checklist

## Permissions - CRITICAL

**⚠️ MANDATORY: Permissions are PART OF THE IMPLEMENTATION, not optional!**

- **Every new page/table/button MUST have permissions**
- **Permissions MUST be added to seed.ts**
- **Frontend AND backend permission checks MUST be implemented**

**Before implementing ANY new feature:**
1. Add new page/table/button to `ALL_PAGES`/`ALL_TABLES`/`ALL_BUTTONS` in `backend/prisma/seed.ts`
2. Define permissions for all roles (Admin, User, Hamburger)
3. Implement frontend permission checks with `usePermissions()` hook
4. Implement backend permission checks with `checkPermission` middleware
5. Test seed file: `npx prisma db seed`

**Example:**
```typescript
// backend/prisma/seed.ts
const ALL_PAGES = [
  'dashboard',
  'new_feature_page', // ← ADD NEW PAGE
];

const adminPermissionMap: Record<string, AccessLevel> = {
  'page_new_feature_page': 'both', // ← DEFINE PERMISSIONS
};
```

**See also:**
- [CODING_STANDARDS.md](CODING_STANDARDS.md) - Full permission rules
- [IMPLEMENTATION_CHECKLIST.md](IMPLEMENTATION_CHECKLIST.md) - Implementation checklist
- [BERECHTIGUNGSSYSTEM.md](../technical/BERECHTIGUNGSSYSTEM.md) - Permission system documentation

## Notifications - CRITICAL

**⚠️ MANDATORY: Notifications are PART OF THE IMPLEMENTATION, not optional!**

- **Every important action MUST have notifications**
- **Backend translations MUST be added to `translations.ts`**
- **Frontend translations MUST be added to i18n locales**

**Before implementing ANY new feature:**
1. Call `createNotificationIfEnabled` with correct parameters
2. Use `relatedEntityId` and `relatedEntityType` (NOT `targetId`/`targetType`!)
3. Add backend translations to `backend/src/utils/translations.ts`
4. Add frontend translations to `frontend/src/i18n/locales/`

**Example:**
```typescript
// ✅ CORRECT
await createNotificationIfEnabled({
  userId: assignedUserId,
  title: notificationText.title,
  message: notificationText.message,
  type: NotificationType.task,
  relatedEntityId: task.id, // ← CORRECT
  relatedEntityType: 'assigned' // ← CORRECT
});

// ❌ WRONG - Don't use targetId/targetType
await createNotificationIfEnabled({
  targetId: task.id, // ← WRONG!
  targetType: 'task' // ← WRONG!
});
```

**See also:**
- [CODING_STANDARDS.md](CODING_STANDARDS.md) - Full notification rules
- [IMPLEMENTATION_CHECKLIST.md](IMPLEMENTATION_CHECKLIST.md) - Implementation checklist
- [NOTIFICATION_SYSTEM.md](../modules/NOTIFICATION_SYSTEM.md) - Notification system documentation
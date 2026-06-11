# Production User Deletion

## Choose The Correct Operation

- **Suspend/deactivate**: keep the Auth user and set an explicit suspension state. The email remains reserved and the account can be restored.
- **Permanently delete**: cancel billable subscriptions, write an anonymized audit record, then delete the Auth user. This frees the email for a new signup and cannot be restored.

Do not represent permanent deletion only with `profiles.is_deleted = true`. Supabase Auth will still consider the email registered and will return an anti-enumeration signup response with an empty `identities` array.

## Supported Production Flow

Use the Admin UI **Delete Permanently** action. It calls the `delete-user` Edge Function, which must complete these steps in order:

1. Authenticate the caller and require the `super_user` role.
2. Read the target Auth user and profile.
3. Cancel all Stripe subscriptions found by Auth user ID or email.
4. Write an anonymized record to `deleted_accounts_audit`.
5. Delete the user with `supabase.auth.admin.deleteUser(userId)`.
6. Verify that the email no longer exists in `auth.users`.

Never delete a production user by updating `profiles.is_deleted` alone or by deleting directly from `auth.users` without first reconciling Stripe.

## Pre-Delete Checklist

- Confirm the requested operation is permanent deletion, not temporary suspension.
- Confirm there are no Storage objects owned by the user.
- Confirm Stripe cancellation is configured and succeeds.
- Confirm a recent database backup exists.
- Record the operator and reason in the operational ticket.

## Verification Queries

Find incomplete historical deletions:

```sql
select u.id, u.email, p.deleted_at
from auth.users u
join public.profiles p on p.user_id = u.id
where p.is_deleted;
```

Verify a permanently deleted email is free:

```sql
select id, email
from auth.users
where lower(email) = lower('user@example.com');
```

The second query must return no rows. The corresponding anonymized hash should remain in `public.deleted_accounts_audit`.

## UX Requirements

- Signup with an existing email must show a generic existing-account message because Supabase intentionally prevents account enumeration.
- The message must offer Sign In and Forgot Password.
- A genuinely deleted account should be able to complete a normal new signup because its Auth user no longer exists.
- A suspended account must have a separate, authenticated reactivation flow. Do not label suspension as deletion.

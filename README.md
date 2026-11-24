# Nova Bank UI

Responsive React/Vite banking interface with separate public, sign-in, customer-dashboard, and role-specific staff workspaces.

## Run locally

```sh
npm install
npm run dev
```

With no backend URL configured, sign in with the prefilled demo account:

- Email: `vinay.kumar@demo.nova`
- Password: `NovaDemo2026!`

The demo customer is registered for online banking but starts without a bank account. To preview the complete journey, choose **Open account**, create a demo online-banking profile, sign in, then submit the account application for KYC review. The fictional demo identity and banking data are only for UI preview; demo sign-in is not production authentication, and no real banking operation is executed.

## Project structure

```text
src/
  features/
    auth/pages/                  Registration and sign-in pages
    dashboard/pages/             Customer and staff dashboards
    dashboard/components/        Account onboarding and empty states
    public/pages/                 Public marketing page
    shared/                       Shared feature dialogs
  services/
    apiClient.js                 Shared HTTP client and API errors
    authService.js               Sign-in, current session, sign-out
    bankingService.js            Customer overview and banking actions
    staffService.js              KYC, customer, branch, and employee operations
  shared/components/             Shared brand and icon components
  App.jsx                        Route selection and dashboard access guard
```

## Connect a backend

The frontend is configured for the local API gateway in `.env.local` (`http://localhost:9090`). Start Eureka on port `8761`, then the auth, customer, account, transaction, and KYC services, and finally the API gateway. Restart Vite after changing its environment file. The gateway allows `http://localhost:5173` and `http://127.0.0.1:5173`; update its CORS configuration when using a different origin.

| Method | Gateway endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/auth-service/api/v1/auth/register` | Register `{ "name", "email", "phone", "password" }`; phone must be 10 digits |
| `POST` | `/auth-service/api/v1/auth/login` | Authenticate with `{ "username", "password" }`; returns `{ "token", "refreshToken", "user" }` |
| `POST` | `/auth-service/api/v1/auth/refresh-token` | Exchange the JSON-encoded refresh-token string for a new token pair |
| `GET` | `/customer-service/api/v1/customers/me` | Get the signed-in customer profile |
| `POST` | `/customer-service/api/v1/customers/create` | Save the full customer profile and selected account type |
| `PUT` | `/customer-service/api/v1/customers/update/{customerId}` | Update a profile with the full onboarding details if it already exists |
| `GET` | `/account-service/api/v1/branches/active` | List active branches for the account application form |
| `GET` | `/account-service/api/v1/accounts/customer/{customerId}` | List the customer’s accounts |
| `POST` | `/account-service/api/v1/accounts/{accountId}/debit-card-preview` | Customer-only, idempotently create a masked virtual-card preview for older accounts |
| `GET` | `/account-service/api/v1/accounts/all?page=0&size=100` | Admin-only paginated bank-wide account directory |
| `GET` | `/transaction-service/api/v1/transactions/admin?page=0&size=100` | Admin-only paginated bank-wide transaction ledger |
| `GET` | `/account-service/api/v1/accounts/branch/{branchId}/customer-ids` | Branch-manager-only customer scope for the authenticated branch |
| `POST` | `/transaction-service/api/v1/transactions/mine/deposits` | Customer cash-deposit request; remains pending without changing the balance |
| `GET` | `/transaction-service/api/v1/transactions/deposits/pending` | Teller/branch-manager pending deposit queue scoped to the assigned branch |
| `GET` | `/transaction-service/api/v1/transactions/deposits/recent` | Teller/branch-manager branch-scoped deposit audit log |
| `POST` | `/transaction-service/api/v1/transactions/deposits/{transactionId}/post` | Verify and post a customer deposit; records the authenticated staff actor |
| `POST` | `/transaction-service/api/v1/transactions/deposit` | Record and post a teller/branch-manager cash deposit at their assigned branch |
| `POST` | `/kyc-service/api/v1/kyc/submit/documents` | Save Aadhaar/PAN numbers and multipart files in the KYC database, including the selected `preferredBranchId` (`BR-D7CA5EADF5` for Nova Bank Delhi Main Branch) |
| `GET` | `/kyc-service/api/v1/kyc/customer/{customerId}` | Get KYC records used by the application tracker |
| `PATCH` | `/kyc-service/api/v1/kyc/{kycId}/status` | KYC staff approve or reject a review; approval triggers account creation at the selected active branch |
| `GET` | `/kyc-service/api/v1/kyc/all` | KYC officer/admin review queue |
| `GET` | `/kyc-service/api/v1/kyc/{kycId}/documents/{documentId}` | Authorized inline preview of a submitted KYC document |
| `GET` | `/customer-service/api/v1/customers/all` | Branch manager, KYC officer, and admin customer directory |
| `POST` | `/account-service/api/v1/branches/create` | Admin-only branch creation |
| `POST` | `/auth-service/api/v1/admin/auth/employee/register` | Admin-only staff registration |
| `POST` | `/auth-service/api/v1/admin/auth/role/add` | Admin-only staff-role setup |
| `PATCH` | `/auth-service/api/v1/admin/auth/assign/role/{userId}` | Admin-only staff-role assignment |

The API client keeps access and refresh tokens in `sessionStorage`, sends bearer authorization, and refreshes expired access tokens. Login reads the JWT roles and routes `KYC_OFFICER`, `TELLER`, `BRANCH_MANAGER`, and `ADMIN` users to their staff workspace; `CUSTOMER` users retain the customer dashboard. Teller and branch-manager employees must be assigned an active branch by an administrator; the branch ID is included in access/refresh tokens and enforced by account, customer, and deposit APIs. KYC officers can inspect and review applications, preview submitted documents, and approve an account opening. Branch managers can browse and manage customers with accounts at their assigned branch; tellers see branch deposit operations. Admins can review KYC, inspect customers, create branches, prepare staff roles, register employees, assign roles, and assign branches. Admin account and transaction directories are paginated by the backend and restricted to the `ADMIN` role. Staff controls are also enforced by backend role checks.

New account records receive a backend-generated virtual-card preview reference and five-year expiry metadata. Existing accounts receive the same masked preview on the customer’s first account overview load. This is display-only: no payment-card PAN, CVV, or PIN is generated or stored, and the preview cannot process payments. Usable debit-card issuance requires integration with a bank/card-network issuer.

Customers can request a cash deposit from their dashboard, but that request does not change the balance. A teller or branch manager at the account’s branch must verify receipt and post the request. Staff can also record a cash deposit received at their branch. Deposit transaction records retain the requestor, posting employee, employee role, branch, reference, status, and timestamps; credit operations require a teller/branch-manager role and a matching branch assignment. Deposit and KYC workspaces refresh their queues every 30 seconds. Registration submits the backend's `name`, `email`, `phone`, and `password` fields, then displays its success response on the sign-in page; backend validation/authentication errors are shown in the UI. Customer registration creates only an online-banking identity; the account application collects all customer profile fields (including optional alternate contact, communication address, and employment/income details), saves them in customer-service, then saves KYC numbers, file metadata, and document bytes in the KYC database. Demo mode remains available when `VITE_API_BASE_URL` is unset.

After KYC approval, the KYC Officer/Admin JWT is forwarded across customer-service to the role-protected account-service endpoint, which opens the account automatically at the applicant's selected branch and changes the customer status from `PENDING` to `ACTIVE`. The customer dashboard polls while KYC is pending, then displays the account number, branch, and balance after opening. The Delhi branch (`BR-D7CA5EADF5`) is the current default; configure `DEFAULT_BRANCH_ID` only if changing that fallback. Configure `JWT_SECRET` for KYC-service to the same signing key used by the other services. KYC applications and uploaded document bytes are persisted in the configured `nova_kyc` MySQL database; Hibernate creates or updates the KYC tables on service startup.

The Vite `VITE_` environment variable is public client configuration; never put secrets in it.

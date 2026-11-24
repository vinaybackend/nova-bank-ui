import { ApiError, apiRequest, isApiConfigured } from './apiClient'

const demoApplicationKey = (customer) =>
  `nova.demo.account-application.${encodeURIComponent(
    customer?.id || customer?.email || 'anonymous'
  )}`

const demoOverview = {
  currency: 'INR',
  totalBalance: 0,
  accounts: [],
  transactions: [],
}

const demoBranches = [
  {
    id: 1,
    branchCode: 'NOVA42K',
    branchName: 'Nova Bank Delhi Main Branch',
    ifscCode: 'NOVA0001234',
    city: 'New Ashok Nagar',
    district: 'East Delhi',
    state: 'Delhi',
    status: 'ACTIVE',
  },
]

/* =====================================================
   Shared helpers
===================================================== */
const getField = (payload, key) =>
  payload instanceof FormData ? payload.get(key) : payload?.[key]

const optionalField = (payload, key) => {
  const value = getField(payload, key)
  if (typeof value !== 'string') return value || null
  const trimmed = value.trim()
  return trimmed || null
}

const digitsOnly = (value) =>
  value == null ? '' : String(value).replace(/\D/g, '')

const buildCustomerDetails = (payload) => ({
  accountType: String(getField(payload, 'accountType') || 'SAVINGS').toUpperCase(),
  currency: getField(payload, 'currency') || 'INR',
  title: String(getField(payload, 'title') || 'MR').toUpperCase(),
  name: getField(payload, 'name')?.trim(),
  openingBalance: Number(getField(payload, 'openingBalance') || 0),
  dateOfBirth: getField(payload, 'dateOfBirth')
    ? String(getField(payload, 'dateOfBirth')).split('T')[0]
    : null,
  gender: String(getField(payload, 'gender') || 'MALE').toUpperCase(),
  nationality: getField(payload, 'nationality')?.trim(),
  maritalStatus: String(
    optionalField(payload, 'maritalStatus') || 'SINGLE'
  ).toUpperCase(),
  email: getField(payload, 'email')?.trim(),
  mobileNumber: digitsOnly(getField(payload, 'phone')),
  alternateMobileNumber:
    digitsOnly(optionalField(payload, 'alternateMobileNumber')) || null,
  branchCode: getField(payload, 'preferredBranchCode'),
  branchName: null,
  ifscCode: null,
  permanentAddress: getField(payload, 'permanentAddress')?.trim(),
  permanentCity: getField(payload, 'permanentCity')?.trim(),
  permanentState: getField(payload, 'permanentState')?.trim(),
  permanentCountry: getField(payload, 'permanentCountry')?.trim(),
  permanentPinCode: getField(payload, 'permanentPinCode')?.trim(),
  communicationAddress: optionalField(payload, 'communicationAddress'),
  communicationCity: optionalField(payload, 'communicationCity'),
  communicationState: optionalField(payload, 'communicationState'),
  communicationCountry: optionalField(payload, 'communicationCountry'),
  communicationPinCode: optionalField(payload, 'communicationPinCode'),
  occupation: optionalField(payload, 'occupation'),
  annualIncome: optionalField(payload, 'annualIncome')
    ? Number(optionalField(payload, 'annualIncome'))
    : null,
  sourceOfIncome: String(
    optionalField(payload, 'sourceOfIncome') || 'SALARY'
  ).toUpperCase(),
  language: optionalField(payload, 'language'),
})

const buildCustomerForm = (customerDetails, payload) => {
  const form = new FormData()
  form.set(
    'customer',
    new Blob([JSON.stringify(customerDetails)], { type: 'application/json' })
  )
  const imageFile = getField(payload, 'profileImage')
  if (imageFile instanceof File || imageFile instanceof Blob) {
    form.set('profileImage', imageFile, imageFile.name || 'profileImage.jpg')
  }
  return form
}

const buildKycForm = (fields, payload) => {
  const form = new FormData()
  const appendText = (key, value) => {
    if (value !== undefined && value !== null && String(value).length > 0) {
      form.set(key, String(value))
    }
  }

  appendText('customerId', fields.customerId)
  appendText('kycType', fields.kycType || 'IDENTITY')
  appendText('preferredBranchCode', fields.preferredBranchCode)
  appendText('aadhaarNumber', fields.aadhaarNumber?.trim())
  appendText('panNumber', fields.panNumber?.trim().toUpperCase())
  appendText('name', fields.name?.trim())
  appendText('email', fields.email?.trim())
  appendText('mobileNumber', digitsOnly(fields.mobileNumber))

  for (const key of ['aadhaarFile', 'panFile']) {
    const file = getField(payload, key)
    if (file instanceof File || file instanceof Blob) {
      form.set(key, file, file.name || key)
    }
  }
  return form
}

/* =====================================================
   Fetch Active Branches (branch-service)
===================================================== */
export async function getActiveBranches() {
  if (!isApiConfigured) return demoBranches

  try {
    const response = await apiRequest(
      '/branch-service/api/v1/branches?status=ACTIVE&page=0&size=100'
    )
    if (Array.isArray(response)) return response
    if (response && Array.isArray(response.content)) return response.content
    throw new Error('The branch service returned an invalid branch list.')
  } catch (error) {
    console.error('Failed to fetch branches:', error)
    throw error
  }
}

/* =====================================================
   Customer Direct Deposit (PATCH /deposit/{accountNumber})
===================================================== */
export async function depositToAccount(accountNumber, amount) {
  if (!accountNumber) throw new Error('Account Number is required.')
  if (!amount || amount <= 0) throw new Error('Valid amount is required.')

  if (isApiConfigured) {
    return apiRequest(
      `/account-service/api/v1/accounts/deposit/${encodeURIComponent(accountNumber)}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ amount: Number(amount) }),
      }
    )
  }

  return 'Demo deposit successful'
}

/* =====================================================
   Update Customer Profile (PUT /update-customer-profile)
===================================================== */
export async function updateCustomerProfile(customerId, payload) {
  if (!isApiConfigured) {
    return { message: 'Demo profile updated successfully' }
  }

  return apiRequest(
    `/customer-service/api/v1/customers/update-customer-profile`,
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    }
  )
}

/* =====================================================
   PUBLIC (guest) account application — NO LOGIN REQUIRED
===================================================== */
export async function submitPublicApplication(payload) {
  const customerDetails = buildCustomerDetails(payload)

  if (!isApiConfigured) {
    const application = {
      id: `NVB-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`,
      status: 'KYC_PENDING',
      accountType: customerDetails.accountType,
      branchCode: customerDetails.branchCode,
      submittedAt: new Date().toISOString(),
      currentStage: 'KYC_REVIEW',
      message:
        'Demo preview only. With the backend connected, your application would be submitted to Nova Bank for KYC review.',
    }
    try {
      sessionStorage.setItem(
        demoApplicationKey({ email: customerDetails.email }),
        JSON.stringify(application)
      )
    } catch (e) {
      /* ignore storage errors */
    }
    return application
  }

  let profile
  try {
    const customerForm = buildCustomerForm(customerDetails, payload)
    profile = await apiRequest('/customer-service/api/v1/customers/create', {
      method: 'POST',
      body: customerForm,
    })
  } catch (error) {
    throw new Error(
      error?.message ||
        'Could not create your customer profile. Please check your details and try again.'
    )
  }

  if (!profile?.customerId) {
    throw new Error(
      'The customer service did not return a customerId. Please contact Nova Bank support.'
    )
  }

  let kyc
  try {
    const documentData = buildKycForm(
      {
        customerId: profile.customerId,
        kycType: 'IDENTITY',
        preferredBranchCode: customerDetails.branchCode,
        aadhaarNumber: getField(payload, 'aadhaarNumber'),
        panNumber: getField(payload, 'panNumber'),
        name: customerDetails.name,
        email: customerDetails.email,
        mobileNumber: customerDetails.mobileNumber,
      },
      payload
    )

    kyc = await apiRequest('/kyc-service/api/v1/kyc/submit/documents', {
      method: 'POST',
      body: documentData,
    })
  } catch (error) {
    throw new Error(
      error?.message ||
        'Your profile was created, but submitting your KYC documents failed. Please contact Nova Bank support with your email.'
    )
  }

  return {
    id: kyc.kycId || profile.customerId,
    customerId: profile.customerId,
    status: 'KYC_PENDING',
    currentStage: 'KYC_REVIEW',
    submittedAt: kyc.createdAt || new Date().toISOString(),
    branchCode: kyc.branchCode || customerDetails.branchCode,
    branchName: kyc.branchName || null,
    branchIfsc: kyc.branchIfsc || null,
    message:
      'Your application was received. Once our team verifies your KYC and opens your account, we will email your username and password.',
  }
}

/* =====================================================
   Customer Overview
===================================================== */
export async function getCustomerOverview(customer) {
  if (isApiConfigured) {
    let profile
    try {
      profile = await apiRequest('/customer-service/api/v1/customers/me')
    } catch (error) {
      if (error.status === 404) {
        return { ...demoOverview, customer: null, application: null }
      }
      throw error
    }

    const customerId = encodeURIComponent(profile.customerId)
    let [accounts, kycs, transactions] = await Promise.all([
      apiRequest(
        `/account-service/api/v1/accounts/customer/${customerId}`
      ).catch((error) => {
        if (error instanceof ApiError && error.status === 404) return []
        throw error
      }),
      apiRequest(`/kyc-service/api/v1/kyc/customer/${customerId}`).catch(
        (error) => {
          if (error instanceof ApiError && error.status === 404) return []
          throw error
        }
      ),
      apiRequest('/transaction-service/api/v1/transactions/mine').catch(
        (error) => {
          if (error instanceof ApiError && error.status === 404) return []
          throw error
        }
      ),
    ])

    accounts = accounts || []
    kycs = kycs || []
    transactions = transactions || []

    if (accounts.some((account) => !account.debitCard)) {
      accounts = await Promise.all(
        accounts.map((account) =>
          account.debitCard
            ? account
            : apiRequest(
                `/account-service/api/v1/accounts/${encodeURIComponent(
                  account.accountId
                )}/debit-card-preview`,
                { method: 'POST' }
              ).catch((error) => {
                if (error instanceof ApiError && error.status === 404)
                  return account
                throw error
              })
        )
      )
    }

    const latestKyc =
      [...kycs].sort(
        (left, right) =>
          new Date(right.createdAt || 0) - new Date(left.createdAt || 0)
      )[0] || null
    const kycStatus = String(latestKyc?.verificationStatus || '').toUpperCase()
    const application = latestKyc
      ? {
          id: latestKyc.kycId,
          status: accounts.length
            ? 'ACCOUNT_OPENED'
            : kycStatus === 'APPROVED'
            ? 'KYC_APPROVED'
            : kycStatus === 'REJECTED'
            ? 'REJECTED'
            : 'KYC_PENDING',
          currentStage: accounts.length
            ? 'ACCOUNT_OPENED'
            : kycStatus === 'APPROVED'
            ? 'ACCOUNT_OPENING'
            : 'KYC_REVIEW',
          submittedAt: latestKyc.createdAt,
          branchCode: latestKyc.branchCode,
          branchName: latestKyc.branchName,
          branchIfsc: latestKyc.branchIfsc,
          rejectionReason: latestKyc.rejectionReason,
          customerStatus: profile.status || 'PENDING',
        }
      : null

    const mappedAccounts = accounts.map((account) => ({
      id: account.accountId,
      accountId: account.accountId,
      name: `${
        account.accountType === 'CURRENT' ? 'Current' : 'Savings'
      } account`,
      accountType: account.accountType || 'SAVINGS',
      accountNumber: account.accountNumber,
      accountStatus: String(account.accountStatus || 'ACTIVE').toUpperCase(),
      email: account.email || profile.email || null,
      customerId: account.customerId || profile.customerId,
      currency: account.currency || 'INR',
      branchCode: account.branchCode,
      branchName: account.branchName,
      ifsc: account.ifsc,
      balance: Number(account.balance || 0),
      status: String(account.accountStatus || 'ACTIVE').toUpperCase(),
      createdAt: account.createdAt || null,
      updatedAt: account.updatedAt || null,
      debitCard:
        account.debitCard && typeof account.debitCard === 'object'
          ? {
              debitCardReference:
                account.debitCard.debitCardReference || null,
              cardStatus: String(
                account.debitCard.cardStatus || account.debitCard.status || ''
              ).toUpperCase(),
              lastFourDigits: String(
                account.debitCard.lastFourDigits ||
                  account.debitCard.last4 ||
                  account.debitCard.debitCardReference
                    ?.replace(/\s/g, '')
                    .slice(-4) ||
                  ''
              ).slice(-4),
              cardType: account.debitCard.cardType || 'VIRTUAL',
              issuedAt: account.debitCard.issuedAt || null,
              expiryDate: account.debitCard.expiryDate || null,
            }
          : null,
    }))

    // 👇 UPDATED TRANSACTION MAPPING TO STRIP OUT UNWANTED FIELDS
    const mappedTransactions = transactions
      .map((transaction) => {
        const isCredit = transaction.transactionType === 'DEPOSIT'
        const signedAmount = isCredit
          ? Number(transaction.amount)
          : -Number(transaction.amount)
        
        const accountNumber =
          transaction.accountNumber ||
          transaction.fromAccountNumber ||
          transaction.toAccountNumber

        return {
          id: transaction.transactionId,
          name: transaction.description?.trim() || transaction.transactionType || 'Transaction',
          amount: signedAmount,
          currency: transaction.currency || 'INR',
          status: String(transaction.transactionStatus || 'UNKNOWN').toUpperCase(),
          transactionType: transaction.transactionType,
          createdAt: transaction.createdAt || null,
          reference: transaction.reference || transaction.transactionId,
          
          accountNumber: transaction.accountNumber || null,
          fromAccountNumber: transaction.fromAccountNumber || null,
          toAccountNumber: transaction.toAccountNumber || null,
          performedBy: transaction.performedBy || null,
          description: transaction.description || null,
          
          date: transaction.createdAt
            ? new Date(transaction.createdAt).toLocaleString('en-IN')
            : 'Date unavailable',
        }
      })
      .sort(
        (left, right) =>
          new Date(right.createdAt || 0) - new Date(left.createdAt || 0)
      )

    return {
      ...demoOverview,
      customer: profile,
      accounts: mappedAccounts,
      transactions: mappedTransactions,
      application,
      currency: mappedAccounts[0]?.currency || 'INR',
      totalBalance: mappedAccounts.reduce(
        (total, account) => total + account.balance,
        0
      ),
    }
  }

  let application = null
  try {
    application = JSON.parse(
      sessionStorage.getItem(demoApplicationKey(customer)) || 'null'
    )
  } catch (e) {
    application = null
  }

  return {
    ...demoOverview,
    application,
  }
}

/* =====================================================
   submitBankingAction
===================================================== */
export async function submitBankingAction(
  action,
  payload,
  customer,
  customerProfile,
  customerAccounts = []
) {
  if (isApiConfigured) {
    if (action === 'deposit-request') {
      const deposit = await apiRequest(
        '/transaction-service/api/v1/transactions/mine/deposits',
        {
          method: 'POST',
          body: JSON.stringify({
            accountNumber: payload.accountNumber,
            amount: payload.amount,
            currency: payload.currency,
            description: payload.description?.trim() || null,
          }),
        }
      )
      return {
        id: deposit.transactionId,
        reference: deposit.reference,
        status: deposit.transactionStatus,
        message:
          'Your cash deposit request is pending branch verification. Your account balance will change only after a teller or branch manager confirms receipt of the funds.',
      }
    }

    if (action === 'transfer') {
      const sourceAccount = customerAccounts.find(
        (account) => account.accountNumber === payload.fromAccountNumber
      )
      if (!sourceAccount || sourceAccount.status !== 'ACTIVE') {
        throw new Error('Choose one of your active accounts to send money from.')
      }
      const transfer = await apiRequest(
        '/transaction-service/api/v1/transactions/mine/transfer',
        {
          method: 'POST',
          body: JSON.stringify({
            fromAccountNumber: payload.fromAccountNumber,
            toAccountNumber: payload.toAccountNumber.trim(),
            amount: payload.amount,
            currency: sourceAccount.currency || 'INR',
            description: payload.description?.trim() || null,
          }),
        }
      )
      return {
        id: transfer.transactionId,
        reference: transfer.reference,
        message: `Transfer sent successfully. ${new Intl.NumberFormat('en-IN', {
          style: 'currency',
          currency: transfer.currency || sourceAccount.currency || 'INR',
        }).format(Number(transfer.amount))} sent to account ending ${transfer.toAccountNumber.slice(
          -4
        )}.`,
      }
    }

    if (action === 'account-application' || action === 'kyc-update') {
      const customerDetails =
        action === 'account-application'
          ? buildCustomerDetails(payload)
          : null

      let profile = customerProfile
      if (action === 'account-application') {
        if (!profile?.customerId) {
          try {
            profile = await apiRequest('/customer-service/api/v1/customers/me')
          } catch (error) {
            if (error.status !== 404) throw error
            profile = null
          }

          if (!profile?.customerId) {
            const customerForm = buildCustomerForm(customerDetails, payload)
            profile = await apiRequest(
              '/customer-service/api/v1/customers/create',
              {
                method: 'POST',
                body: customerForm,
              }
            )
          }
        } else {
          const customerForm = buildCustomerForm(customerDetails, payload)
          profile = await apiRequest(
            `/customer-service/api/v1/customers/update/${encodeURIComponent(
              profile.customerId
            )}`,
            {
              method: 'PUT',
              body: customerForm,
            }
          )
        }
      } else if (!profile?.customerId) {
        profile = await apiRequest('/customer-service/api/v1/customers/me')
      }

      const documentData = buildKycForm(
        {
          customerId: profile.customerId,
          kycType: 'IDENTITY',
          preferredBranchCode: getField(payload, 'preferredBranchCode'),
          aadhaarNumber: getField(payload, 'aadhaarNumber'),
          panNumber: getField(payload, 'panNumber'),
          name: getField(payload, 'name') || customer?.name,
          email: getField(payload, 'email') || customer?.email,
          mobileNumber:
            getField(payload, 'phone') || customer?.mobileNumber,
        },
        payload
      )

      const kyc = await apiRequest('/kyc-service/api/v1/kyc/submit/documents', {
        method: 'POST',
        body: documentData,
      })

      return {
        id: kyc.kycId,
        status: 'KYC_PENDING',
        currentStage: 'KYC_REVIEW',
        submittedAt: kyc.createdAt,
        branchCode: kyc.branchCode,
        branchName: kyc.branchName,
        branchIfsc: kyc.branchIfsc,
        customer: profile,
        message:
          action === 'kyc-update'
            ? 'Your updated KYC documents were submitted. Our team will review them shortly.'
            : undefined,
      }
    }

    throw new Error(
      'This action is not available from the connected banking services yet.'
    )
  }

  if (action === 'account-application' || action === 'kyc-update') {
    const application = {
      id: `NVB-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`,
      status: 'KYC_PENDING',
      accountType: getField(payload, 'accountType'),
      branchCode: getField(payload, 'preferredBranchCode'),
      submittedAt: new Date().toISOString(),
      currentStage: 'KYC_REVIEW',
    }
    sessionStorage.setItem(
      demoApplicationKey(customer),
      JSON.stringify(application)
    )
    return application
  }

  return {
    status: 'preview',
    message: 'Preview only. Configure the backend API to submit this request.',
  }
}
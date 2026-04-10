export const sortDirections = {
  descending: -1,
  ascending: 1,
}

export const genderOptions = [
  { value: 0, label: 'Not Specified' },
  { value: 1, label: 'Male' },
  { value: 2, label: 'Female' },
]

export const genderLabels = Object.fromEntries(
  genderOptions.map((option) => [option.value, option.label]),
)

export function createSearch(sortBy = '') {
  return {
    filterText: '',
    page: 0,
    pageSize: 15,
    sortBy,
    sortDirection: sortDirections.ascending,
  }
}

export function createEmptyCustomer() {
  return {
    id: null,
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    postal: '',
    birthDate: null,
    notes: '',
    gender: 0,
    active: false,
    imageBase64: null,
    createdOn: null,
    updateOn: null,
  }
}

export function toApiSearch(search, page) {
  return {
    filterText: search.filterText ?? '',
    page: typeof page === 'number' ? page : search.page,
    pageSize: search.pageSize,
    sortBy: search.sortBy,
    sortDirection: search.sortDirection,
  }
}

export function formatPageCount(total, pageSize) {
  if (!total || total <= 0) {
    return 0
  }

  return Math.ceil(total / pageSize)
}

export function toDateInputValue(value) {
  if (!value) {
    return ''
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return date.toISOString().slice(0, 10)
}

export function normalizeCustomerForApi(customer) {
  return {
    ...customer,
    birthDate: customer.birthDate || null,
    gender: Number(customer.gender),
    active: Boolean(customer.active),
    imageBase64: customer.imageBase64 || null,
  }
}

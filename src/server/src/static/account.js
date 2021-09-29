const PASSWORD_KEY = "rlay.password"

export function loadSavedAccount() {
  const password = localStorage.getItem(PASSWORD_KEY)
  if (password) {
    return account(password)
  }
  return undefined
}

export function account(password) {
  function save() {
    localStorage.setItem(PASSWORD_KEY, password)
  }

  return {
    password,
    save
  }
}
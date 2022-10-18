class SessionStorage {

  static setItem(key, val) {
    let v = JSON.stringify(val);
    sessionStorage.setItem(key, v);
  }

  static getItem(key) {
    const result = sessionStorage.getItem(key)
    if (!result) return null
    return JSON.parse(result);
  }

}

export default SessionStorage;

class LocalStorage {

  static setItem(key, val) {
    let v = JSON.stringify(val);
    localStorage.setItem(key, v);
  }

  static getItem(key) {
    const result = localStorage.getItem(key)
    if (!result) return null
    return JSON.parse(result);
  }

}

export default LocalStorage;

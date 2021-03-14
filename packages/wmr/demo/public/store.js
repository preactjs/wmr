import { useState } from "preact/hooks";

const listeners = new Set();
let user;
/** */
export function useUser() {
  const [userState, setUserState] = useState(user);
  listeners.add(setUserState);
  return userState;
}

export function loadUser() {
  setTimeout(() => {
    setUser({ name: "toto" });
  }, 100);
}
function setUser(newUser) {
  user = newUser;
  listeners.forEach((listener) => listener(user));
}
/**/
/**/

import { ComponentInstaller } from "../desktop/components.mjs";
const installer = new ComponentInstaller();
let last = 0;
installer.progress = ({ name, received, total }) => {
  if (Date.now() - last > 1500) {
    console.log(`${name}: ${Math.round((received / total) * 100)}%`);
    last = Date.now();
  }
};
console.log(JSON.stringify(await installer.install()));

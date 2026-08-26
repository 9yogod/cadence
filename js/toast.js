/* Small bottom toast used for confirmations and errors across the app. */
const toastEl=document.getElementById('toast');

export function toast(m,kind){
  toastEl.textContent=m;
  toastEl.classList.toggle('err',kind==='err');
  toastEl.classList.add('show');
  clearTimeout(toast._t);
  toast._t=setTimeout(()=>toastEl.classList.remove('show'),2200);
}

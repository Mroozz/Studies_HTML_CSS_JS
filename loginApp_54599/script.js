// script.js
// Pełna logika frontend (logowanie / rejestracja / reset / panel warsztatowy)


// 0. DOM shortcuts

const loginView = document.getElementById('loginView');
const registerView = document.getElementById('registerView');
const resetView = document.getElementById('resetView');
const mainView = document.getElementById('mainView');

const loginInput = document.getElementById('loginInput');
const loginPassword = document.getElementById('loginPassword');
const loginSubmit = document.getElementById('loginSubmit');
const loginMsg = document.getElementById('loginMsg');

const linkToRegister = document.getElementById('linkToRegister');
const linkToReset = document.getElementById('linkToReset');
const backToLogin1 = document.getElementById('backToLogin1');
const backToLogin2 = document.getElementById('backToLogin2');

const regLogin = document.getElementById('regLogin');
const regEmail = document.getElementById('regEmail');
const regPass = document.getElementById('regPass');
const regPass2 = document.getElementById('regPass2');
const regAgree = document.getElementById('regAgree');
const registerBtn = document.getElementById('registerBtn');
const regMsg = document.getElementById('regMsg');

const resetEmail = document.getElementById('resetEmail');
const resetBtn = document.getElementById('resetBtn');
const resetMsg = document.getElementById('resetMsg');

const btnMyCars = document.getElementById('btnMyCars');
const btnClientDB = document.getElementById('btnClientDB');
const btnAddCar = document.getElementById('btnAddCar');
const btnDelete = document.getElementById('btnDelete');
const btnLogout = document.getElementById('btnLogout');

const vehicleList = document.getElementById('vehicleList');
const clientList = document.getElementById('clientList');
const clientListInner = document.getElementById('clientListInner');

const adminAddBox = document.getElementById('adminAddBox');
const assignToUser = document.getElementById('assignToUser');
const adminAddBtn = document.getElementById('adminAddBtn');
const a_reg = document.getElementById('a_reg');
const a_model = document.getElementById('a_model');
const a_rok = document.getElementById('a_rok');
const a_vin = document.getElementById('a_vin');
const a_engineCap = document.getElementById('a_engineCap');

const firstCarModal = document.getElementById('firstCarModal');
const firstCarClose = document.getElementById('firstCarClose');
const firstCarSave = document.getElementById('firstCarSave');
const f_reg = document.getElementById('f_reg');
const f_model = document.getElementById('f_model');
const f_vin = document.getElementById('f_vin');
const f_engineCap = document.getElementById('f_engineCap');


// 1. Storage + seed data

const STORAGE_USERS = 'ws_users_v1';
const STORAGE_VEH = 'ws_vehicles_v1';

let users = {};
let vehicles = {};
let currentUser = null; // stores email key (or 'admin@local')

// load
try { users = JSON.parse(localStorage.getItem(STORAGE_USERS) || '{}'); } catch(e){ users = {}; }
try { vehicles = JSON.parse(localStorage.getItem(STORAGE_VEH) || '{}'); } catch(e){ vehicles = {}; }

// ensure admin + demo
if (!users['admin@local']) {
  users['admin@local'] = { login: 'admin', email: 'admin@local', pass: 'admin', admin: true, firstCarDismissed: true };
  vehicles['admin@local'] = [];
}
if (!users['demo@local']) {
  users['demo@local'] = { login: 'demo', email: 'demo@local', pass: 'demo', admin: false, firstCarDismissed: true };
  vehicles['demo@local'] = [{
    reg:'KR100AA', model:'Renault Clio', rok:'2014', vin:'VF1AA...', engineCap:'1.2',
    historia:'Przegląd 2022', naprawa:'Wymiana klocków', koszt:'200', uwagi:'Brak',
    opony:'3 mm', silnik:'ENG123', przebieg:'120000', oilKm:'115000', filterAir:'OK', filterCabin:'OK', filterFuel:'OK'
  }];
}

function persist(){
  localStorage.setItem(STORAGE_USERS, JSON.stringify(users));
  localStorage.setItem(STORAGE_VEH, JSON.stringify(vehicles));
}
persist();

// 2. Utility UI helpers

function showMsg(el, text, ok=false){
  if (!el) return;
  el.textContent = text || '';
  el.classList.remove('error','success');
  if (text) el.classList.add(ok ? 'success' : 'error');
}
function clearAllMsgs(){
  [loginMsg, regMsg, resetMsg].forEach(e => { if (e) { e.textContent=''; e.classList.remove('error','success'); }});
}
function escapeHtml(s){ if (s===null || s===undefined) return ''; return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function autogrowTextarea(el){ if(!el) return; el.style.height='auto'; el.style.height = (el.scrollHeight)+'px'; el.addEventListener('input', ()=>{ el.style.height='auto'; el.style.height=(el.scrollHeight)+'px'; }); }

// 3. Navigation show/hide

function showLogin(){
  loginView.classList.remove('hidden');
  registerView.classList.add('hidden');
  resetView.classList.add('hidden');
  mainView.classList.add('hidden');
  clearAllMsgs();
  // clear login inputs
  loginInput.value=''; loginPassword.value='';
}
function showRegister(){
  loginView.classList.add('hidden');
  registerView.classList.remove('hidden');
  resetView.classList.add('hidden');
  clearAllMsgs();
}
function showReset(){
  loginView.classList.add('hidden');
  registerView.classList.add('hidden');
  resetView.classList.remove('hidden');
  clearAllMsgs();
}
function showMain(){
  loginView.classList.add('hidden');
  registerView.classList.add('hidden');
  resetView.classList.add('hidden');
  mainView.classList.remove('hidden');
  refreshUI();
}

// wire links/buttons
linkToRegister.addEventListener('click', (e)=>{ e.preventDefault(); showRegister(); });
linkToReset.addEventListener('click', (e)=>{ e.preventDefault(); showReset(); });
backToLogin1.addEventListener('click', (e)=>{ e.preventDefault(); showLogin(); });
backToLogin2.addEventListener('click', (e)=>{ e.preventDefault(); showLogin(); });


// 4. Registration (with validation, no alert())

registerBtn.addEventListener('click', function(){
  showMsg(regMsg, '');
  const login = (regLogin.value||'').trim();
  const email = (regEmail.value||'').trim().toLowerCase();
  const pass = regPass.value || '';
  const pass2 = regPass2.value || '';
  const agreed = !!regAgree.checked;

  if (!login || login.length < 3) { showMsg(regMsg, 'Pole login nie może być puste. Min. 3 znaki.'); return; }
  if (!email || email.indexOf('@') === -1) { showMsg(regMsg, 'Adres e-mail ma niepoprawny format.'); return; }
  if (pass.length < 6) { showMsg(regMsg, 'Hasło musi mieć co najmniej 6 znaków.'); return; }
  if (pass !== pass2) { showMsg(regMsg, 'Hasła nie są identyczne.'); return; }
  if (!agreed) { showMsg(regMsg, 'Musisz zaakceptować regulamin.'); return; }

  // uniqueness checks: email and login
  if (users[email]) { showMsg(regMsg, 'Konto o tym e-mailu już istnieje.'); return; }
  for (let k in users){ if (users[k].login && users[k].login.toLowerCase() === login.toLowerCase()){ showMsg(regMsg, 'Login jest już zajęty.'); return; } }

  // create
  users[email] = { login: login, email: email, pass: pass, admin: false, firstCarDismissed: false };
  vehicles[email] = [];
  persist();

  showMsg(regMsg, 'Konto zostało utworzone.', true);

  // auto-login and go to main; force first car creation
  currentUser = email;
  showMain();
  maybeShowFirstCarModal();
});


// 5. Reset password (simulation)

resetBtn.addEventListener('click', function(){
  showMsg(resetMsg, '');
  const mail = (resetEmail.value||'').trim().toLowerCase();
  if (!mail){ showMsg(resetMsg, 'Podaj e-mail.'); return; }
  if (mail.indexOf('@') === -1){ showMsg(resetMsg, 'Adres e-mail ma niepoprawny format.'); return; }
  showMsg(resetMsg, 'Na Twój e-mail wysłano link resetujący.', true);
});


// 6. Login (accept login or email) - messages in loginMsg (no alerts)

loginSubmit.addEventListener('click', doLogin);
function doLogin(){
  showMsg(loginMsg, '');
  const identifier = (loginInput.value||'').trim();
  const pass = (loginPassword.value||'').trim();

  if (!identifier || identifier.length < 3){ showMsg(loginMsg, 'Pole login nie może być puste.'); return; }
  if (!pass){ showMsg(loginMsg, 'Hasło nie może być puste.'); return; }

  // admin shortcut
  if ((identifier === 'admin' || identifier === 'admin@local') && pass === 'admin'){
    currentUser = 'admin@local';
    showMsg(loginMsg, 'Zalogowano pomyślnie.', true);
    setTimeout(()=> showMain(), 200);
    return;
  }

  // find by email or login
  let found = null;
  if (identifier.indexOf('@') !== -1){
    if (users[identifier]) found = users[identifier];
  } else {
    for (let k in users){
      if (users[k].login && users[k].login.toLowerCase() === identifier.toLowerCase()){
        found = users[k]; break;
      }
    }
  }

  if (!found){ showMsg(loginMsg, 'Konto nie istnieje.'); return; }
  if (found.pass !== pass){ showMsg(loginMsg, 'Nieprawidłowe hasło.'); return; }

  // success
  currentUser = found.email;
  showMsg(loginMsg, 'Zalogowano pomyślnie.', true);
  setTimeout(()=> { showMain(); maybeShowFirstCarModal(); }, 200);
}

// allow Enter in password field to login
loginPassword.addEventListener('keypress', function(e){ if (e.key === 'Enter') doLogin(); });
loginInput.addEventListener('keypress', function(e){ if (e.key === 'Enter') doLogin(); });


// 7. Logout and delete account

btnLogout.addEventListener('click', function(){
  currentUser = null;
  // hide main and clear lists
  vehicleList.innerHTML = '';
  clientListInner.innerHTML = '';
  adminAddBox.classList.add('hidden');
  clientList.classList.add('hidden');
  firstCarModal.classList.add('hidden');
  showLogin();
});

btnDelete.addEventListener('click', function(){
  if (!currentUser || currentUser === 'admin@local'){ alert('Admin nie może usuwać własnego konta w tym prototypie.'); return; }
  if (!confirm('Usunąć konto?')) return;
  delete users[currentUser];
  delete vehicles[currentUser];
  persist();
  currentUser = null;
  showLogin();
});


// 8. First-car modal (Option A) behavior

function maybeShowFirstCarModal(){
  if (!currentUser || currentUser === 'admin@local') return;
  if (!users[currentUser]) return;
  const arr = vehicles[currentUser] || [];
  if (arr.length === 0 && !users[currentUser].firstCarDismissed){
    firstCarModal.classList.remove('hidden');
  } else {
    firstCarModal.classList.add('hidden');
  }
}

firstCarClose.addEventListener('click', function(){
  if (currentUser && users[currentUser]) users[currentUser].firstCarDismissed = true;
  persist();
  firstCarModal.classList.add('hidden');
});

firstCarSave.addEventListener('click', function(){
  const reg = (f_reg.value||'').trim();
  const model = (f_model.value||'').trim();
  if (!reg || !model){ alert('Rejestracja i model są wymagane'); return; }
  if (!vehicles[currentUser]) vehicles[currentUser] = [];
  vehicles[currentUser].push({
    reg, model, vin: (f_vin.value||'').trim(), engineCap: (f_engineCap.value||'').trim(),
    rok:'–', historia:'–', naprawa:'–', koszt:'–', uwagi:'–', opony:'–', silnik:'–', przebieg:'–', oilKm:'–', filterAir:'–', filterCabin:'–', filterFuel:'–'
  });
  users[currentUser].firstCarDismissed = true;
  persist();
  firstCarModal.classList.add('hidden');
  refreshUI();
  showMyCars();
});


// 9. Admin add vehicle

adminAddBtn.addEventListener('click', function(){
  const target = assignToUser.value;
  const reg = (a_reg.value||'').trim();
  const model = (a_model.value||'').trim();
  if (!target){ alert('Wybierz klienta'); return; }
  if (!reg || !model){ alert('Wpisz minimum rejestrację i model'); return; }
  if (!vehicles[target]) vehicles[target] = [];
  vehicles[target].push({ reg, model, rok: (a_rok.value||'').trim() || '–', vin: (a_vin.value||'').trim() || '–', engineCap: (a_engineCap.value||'').trim() || '–', historia:'–', naprawa:'–', koszt:'–', uwagi:'–', opony:'–', silnik:'–', przebieg:'–', oilKm:'–', filterAir:'–', filterCabin:'–', filterFuel:'–' });
  persist();
  alert('Dodano pojazd klientowi');
  populateAssignList();
  displayClientList();
});

// 10. UI refresh / lists rendering

btnMyCars.addEventListener('click', showMyCars);
btnClientDB.addEventListener('click', displayClientList);
btnAddCar.addEventListener('click', ()=> { adminAddBox.classList.toggle('hidden'); });

function refreshUI(){
  const isAdmin = (currentUser === 'admin@local') || (users[currentUser] && users[currentUser].admin);
  btnClientDB.classList.toggle('hidden', !isAdmin);
  btnAddCar.classList.toggle('hidden', !isAdmin);
  adminAddBox.classList.toggle('hidden', !isAdmin);
  populateAssignList();
  if (isAdmin) displayClientList(); else showMyCars();
}

function populateAssignList(){
  assignToUser.innerHTML = '';
  for (let k in users){
    if (k === 'admin@local') continue;
    const opt = document.createElement('option');
    opt.value = k;
    opt.textContent = users[k].login ? users[k].login + ' (' + k + ')' : k;
    assignToUser.appendChild(opt);
  }
}

function showMyCars(){
  clientList.classList.add('hidden');
  adminAddBox.classList.add('hidden');
  vehicleList.classList.remove('hidden');

  if (!vehicles[currentUser] || vehicles[currentUser].length === 0){
    maybeShowFirstCarModal();
    vehicleList.innerHTML = '<div class="card">Brak pojazdów.</div>';
    return;
  }
  renderCars(currentUser);
}

function displayClientList(){
  if (!users[currentUser] || !users[currentUser].admin) return;
  clientList.classList.remove('hidden');
  vehicleList.classList.add('hidden');
  adminAddBox.classList.add('hidden');
  clientListInner.innerHTML = '';
  for (let k in users){
    if (k === 'admin@local') continue;
    const cnt = vehicles[k] ? vehicles[k].length : 0;
    clientListInner.innerHTML += `<div class="card"><b>${users[k].login||k}</b> — pojazdów: ${cnt}</div>`;
  }
}


// 11. renderCars / save / delete functions

function renderCars(userEmail){
  vehicleList.innerHTML = '';
  let targets = {};
  const isAdmin = (currentUser === 'admin@local') || (users[currentUser] && users[currentUser].admin);
  if (isAdmin){
    targets = vehicles;
  } else {
    if (!vehicles[userEmail] || vehicles[userEmail].length === 0){ vehicleList.innerHTML = '<div class="card">Brak pojazdów.</div>'; return; }
    targets[userEmail] = vehicles[userEmail];
  }

  for (let owner in targets){
    const arr = targets[owner] || [];
    for (let i=0;i<arr.length;i++){
      const car = arr[i];
      const readOnly = isAdmin ? '' : 'readonly class="readonly"';
      const controls = isAdmin ? `
        <button class="save-btn" onclick="event.stopPropagation(); window.saveCarChanges('${owner}', ${i}, this)">Zapisz zmiany</button>
        <button class="save-btn" style="background:#b90000;margin-left:8px" onclick="event.stopPropagation(); window.deleteCar('${owner}', ${i})">Usuń pojazd</button>
      ` : '';
      const node = document.createElement('div');
      node.className = 'vehicle-row';
      node.innerHTML = `
        <div class="vehicle-bubble">🚗 ${escapeHtml(car.model)} — ${escapeHtml(car.reg)} <div style="font-size:12px;color:#9aa;margin-top:6px">${owner}</div></div>
        <div class="vehicle-details" onclick="event.stopPropagation()">
          <table>
            <tr><td>Historia:</td><td><textarea>${escapeHtml(car.historia||'')}</textarea></td></tr>
            <tr><td>Naprawa:</td><td><textarea>${escapeHtml(car.naprawa||'')}</textarea></td></tr>
            <tr><td>Olej wymienieniono przy (km):</td><td><input type="number" value="${escapeHtml(car.oilKm||'')}" ${readOnly}></td></tr>
            <tr><td>Filtr powietrza:</td><td><input value="${escapeHtml(car.filterAir||'')}" ${readOnly}></td></tr>
            <tr><td>Filtr kabinowy:</td><td><input value="${escapeHtml(car.filterCabin||'')}" ${readOnly}></td></tr>
            <tr><td>Filtr paliwa:</td><td><input value="${escapeHtml(car.filterFuel||'')}" ${readOnly}></td></tr>
            <tr><td>Stan opon:</td><td><input value="${escapeHtml(car.opony||'')}" ${readOnly}></td></tr>
            <tr><td>Numer silnika:</td><td><input value="${escapeHtml(car.silnik||'')}" ${readOnly}></td></tr>
            <tr><td>VIN:</td><td><input value="${escapeHtml(car.vin||'')}" ${readOnly}></td></tr>
            <tr><td>Rok:</td><td><input value="${escapeHtml(car.rok||'')}" ${readOnly}></td></tr>
            <tr><td>Przebieg:</td><td><input value="${escapeHtml(car.przebieg||'')}" ${readOnly}></td></tr>
            <tr><td>Pojemność silnika (l):</td><td><input value="${escapeHtml(car.engineCap||'')}" ${readOnly}></td></tr>
          </table>
          ${controls}
        </div>
      `;
      // toggle details on click except inputs
      node.addEventListener('click', function(e){
        // if click came from an input/textarea/button inside, ignore
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'BUTTON') return;
        const d = this.querySelector('.vehicle-details');
        d.style.display = d.style.display === 'block' ? 'none' : 'block';
      });
      vehicleList.appendChild(node);
    }
  }

  // autogrow textareas
  const tAs = vehicleList.querySelectorAll('textarea');
  tAs.forEach(t => autogrowTextarea(t));
}

// save changes by admin (exposed)
window.saveCarChanges = function(owner, index, btn){
  const details = btn.parentElement;
  const rows = details.querySelectorAll('table tr');
  const mapping = ['historia','naprawa','oilKm','filterAir','filterCabin','filterFuel','opony','silnik','vin','rok','przebieg','engineCap'];
  for (let i=0;i<mapping.length;i++){
    const cell = rows[i].querySelectorAll('td')[1];
    const field = cell.querySelector('input,textarea');
    vehicles[owner][index][mapping[i]] = field ? field.value : vehicles[owner][index][mapping[i]];
  }
  persist();
  alert('Zmiany zapisane');
};

// delete car (admin only)
window.deleteCar = function(owner, index){
  if (!confirm('Na pewno usunąć ten pojazd?')) return;
  vehicles[owner].splice(index,1);
  persist();
  alert('Pojazd usunięty');
  if (currentUser === 'admin@local' || (users[currentUser] && users[currentUser].admin)) renderCars(null);
  else renderCars(currentUser);
};

// 12. Misc functions / init

function showMyCars(){ showMain(); renderCars(currentUser); }
function renderCarsForAdmin(){ showMain(); renderCars(null); }

// initial display
showLogin();


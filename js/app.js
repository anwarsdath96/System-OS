function syncOSDashboardTheme(light){
  const frame=document.querySelector("#osPage .os-home-dashboard-frame");
  try{
    const doc=frame&&frame.contentDocument;
    if(!doc)return;
    doc.documentElement.classList.toggle("light-mode",!!light);
    doc.body.classList.toggle("light-mode",!!light);
    if(frame) frame.style.backgroundColor=light?"#e9edf2":"#050c13";
  }catch(e){}
}
function applyTheme(theme){
  const light=theme==="light";
  document.documentElement.classList.toggle("light-mode",light);
  document.body.classList.toggle("light-mode",light);
  document.querySelectorAll(".theme-toggle").forEach(button=>{
    const label=light?"Switch to dark mode":"Switch to light mode";
    button.setAttribute("aria-label",label);
    button.setAttribute("title",label);
  });
  try{localStorage.setItem("personalOS_theme",light?"light":"dark");}catch(e){}
  syncOSDashboardTheme(light);
}
function toggleTheme(){
  const next=document.body.classList.contains("light-mode")?"dark":"light";
  applyTheme(next);
}
/* ==============================
   PERSONAL OS — CLOUD V1
   Supabase-backed authentication + database
   ============================== */

// 1) Paste your Supabase project values here.
//    These are the browser-safe project URL and publishable key.
//    NEVER put a Supabase secret/service_role key in this file.
const SUPABASE_URL = "https://tgrgfksbbcvgyinipxqo.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_qXwSi3Go5Zf1ShGbg0Lb_w_5YVNlt28";

const supabaseClient = (SUPABASE_URL.startsWith("https://") && !SUPABASE_URL.includes("PASTE_") && !SUPABASE_PUBLISHABLE_KEY.includes("PASTE_"))
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true }
    })
  : null;

const qualityNames = {1:"Worst",2:"Bad",3:"Okay",4:"Good",5:"Best"};
const qualityPills = {1:"pill-worst",2:"pill-bad",3:"pill-okay",4:"pill-good",5:"pill-best"};
const personalGroups = [
  {title:"Systems", blocks:[["Morning","Night"],["Sleep","Workout","Meditation","Diet","NoPMO"],["Scrolling","Journaling","Reading","Calisthenics"]]},
  {title:"", blocks:[["Errands"]]}
];
const productivityGroups = [
  {blocks:[["Day","Week"]]},
  {blocks:[["Bi-week","Month"]]},
  {blocks:[["Quarter","Bi-quarter"]]},
  {blocks:[["Year"]]}
];
const domainGroups = [
  {blocks:[["Writing","Projects"]]},
  {blocks:[["Money","Fitness","Game"]]},
  {blocks:[["Speaking","Upskilling"]]}
];
const layerItems = {
  1: [...personalGroups[0].blocks.flat(),"Errands"],
  2: ["Day","Week","Bi-week","Month","Quarter","Bi-quarter","Year"],
  3: domainGroups.flatMap(group=>group.blocks.flat()),
  4: []
};
const errandsChildren = ["Wardrobe","Laundry","Groceries","Room Cleaning"];
const personalSidebarItems = [...personalGroups.flatMap(group=>group.blocks.flat()).filter(name=>name!=="Errands"&&!errandsChildren.includes(name)),"Errands",...errandsChildren];
let errandsExpanded = false;
function personalSystemName(item){
  if(currentLayer===1 && item>=1) return personalSidebarItems[item-1]||null;
  return (layerItems[currentLayer]||[])[item-1]||null;
}
const configuredTrackers = ["Sleep","Workout","Meditation"];
function simpleTrackerQuestion(name){
  return {
    "Morning":"Did you complete Morning today?",
    "Night":"Did you complete Night today?",
    "Diet":"Did you follow diet today?",
    "NoPMO":"Did you follow NoPMO today?",
    "Scrolling":"Did you stay off mindless scrolling today?",
    "Journaling":"Did you journal today?",
    "Reading":"Did you read today?",
    "Calisthenics":"Did you do calisthenics today?",
    "Grooming - Hair, spa":"Did you do grooming today?",
    "Laundry":"Did you do laundry today?",
    "Wardrobe":"Did you handle wardrobe today?",
    "Groceries":"Did you do groceries today?",
    "Room Cleaning":"Did you clean the room today?",
    "Vehicles":"Did you handle vehicles today?"
  }[name] || ("Did you complete "+name+" today?");
}

let currentLayer = 1;
let currentItem = 0;
let workspaceMode = "overview";
let selectedDate = getDateString(new Date());
let currentPage = "entry";
let entryHub = blankEntryHub();
function blankEntryHub(){
  return {
    Morning:{value:""},
    Night:{value:""},
    Sleep:{durationBand:"",quality:"",wakeTime:""},
    Workout:{gym:"",cardio:""},
    Meditation:{morning:"",night:""},
    Diet:{value:""},
    Scrolling:{value:""},
    Journaling:{value:""},
    Reading:{value:"",duration:null},
    Calisthenics:{value:""},
    NoPMO:{value:"",tier:""}
  };
}
const outcomeGroups = [
  {tone:"good", items:["Energy","Attention","Calmness","Clarity","Enthusiasm"]},
  {tone:"bad", items:["Fatigue","Mental Fog","Overwhelm","Anxiety","Depression"]},
  {tone:"focus", items:["Time Control","Life Order"]}
];
const productivityOutcomeGroups = [
  {tone:"good", items:["Productivity","Effectiveness","Contentment"]},
  {tone:"bad", items:["Distractions","Frustration","Disappointment"]}
];
function currentOutcomeGroups(){
  return currentLayer===2?productivityOutcomeGroups:outcomeGroups;
}
function currentOutcomeSystem(){
  return currentLayer===2?"Productivity Outcomes":"Outcomes";
}
function blankOutcomes(){
  const scores={};
  currentOutcomeGroups().forEach(group=>group.items.forEach(name=>scores[name]=""));
  return scores;
}
let entryOutcomes = blankOutcomes();
let productivityEntryView = "daily";
let osMode = false;
let authMode = "login";
let currentUser = null;
let workoutState = {gym:"",gymTime:"",cardio:"",cardioTime:null};
let meditationState = {morning:"",morningTime:null,night:"",nightTime:null};
let simpleTrackerState = {system:"",value:""};
let overviewRangeDays = 7;
let outcomeChartView = "bars";
let overviewFocus = "system";
let dashRangeDays = 7;
let entryDateView = "week";
let sleepDurationBand = "";
let sleepQualityValue = "";
const sleepWakeTimes = ["5 AM","5:30 AM","6 AM","6:30 AM","7 AM","7:30 AM","8 AM","9 AM","10 AM"];
const sleepDurationBands = {
  below4:{hours:3,label:"<4 Hours",short:"<4h",bar:"hours-red",pill:"pill-red"},
  "4to5":{hours:4.5,label:"4–5 Hours",short:"4–5h",bar:"hours-orange",pill:"pill-orange"},
  "5to6":{hours:5.5,label:"5–6 Hours",short:"5–6h",bar:"hours-amber",pill:"pill-orange"},
  "6to7":{hours:6.5,label:"6–7 Hours",short:"6–7h",bar:"hours-blue",pill:"pill-blue"},
  "7to8":{hours:7.5,label:"7–8 Hours",short:"7–8h",bar:"hours-green",pill:"pill-green"},
  "8plus":{hours:9,label:"8+ Hours",short:"8h+",bar:"hours-purple",pill:"pill-purple"}
};

function getDateString(date){
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
}
function normalizeEntryDate(value){
  const m=String(value||"").match(/^(\d{4}-\d{2}-\d{2})/);
  return m?m[1]:"";
}
function shiftDateString(dateString, days){
  const d=new Date(dateString+"T12:00:00");
  d.setDate(d.getDate()+days);
  return getDateString(d);
}
function coerceHubValue(value){
  if(value===true || value===1) return "yes";
  if(value===false || value===0) return "no";
  return value==null?"":String(value);
}
function outcomeScoresFromRow(row){
  if(!row) return {};
  if(row.scores && typeof row.scores==="object") return row.scores;
  return row;
}
function formatDate(dateString){
  const date = new Date(dateString+"T00:00:00");
  const monthDay = date.toLocaleDateString(undefined,{month:"long",day:"2-digit"});
  const weekday = date.toLocaleDateString(undefined,{weekday:"long"});
  return `<span class="date-number">${monthDay}</span><span class="weekday">${weekday}</span>`;
}
function setAuthMessage(message, type=""){
  const el=document.getElementById("authMessage");
  el.textContent=message||"";
  el.className="auth-message"+(type?" "+type:"");
}
function setAuthMode(mode){
  authMode=mode;
  document.getElementById("loginTab").classList.toggle("active",mode==="login");
  document.getElementById("signupTab").classList.toggle("active",mode==="signup");
  document.getElementById("authSubmit").textContent=mode==="login"?"Log in":"Create account";
  document.getElementById("authPassword").autocomplete=mode==="login"?"current-password":"new-password";
  setAuthMessage("");
}
function showAuth(){document.getElementById("authOverlay").style.display="flex";}
function hideAuth(){document.getElementById("authOverlay").style.display="none";}
function isConfigured(){return !!supabaseClient;}

async function submitAuth(){
  if(!isConfigured()){
    setAuthMessage("Supabase is not configured yet. Paste your project URL and publishable key into the two constants at the top of this file.","error");
    return;
  }
  const email=document.getElementById("authEmail").value.trim();
  const password=document.getElementById("authPassword").value;
  if(!email || !password){setAuthMessage("Please enter your email and password.","error");return;}
  if(authMode==="signup" && password.length<6){setAuthMessage("Password must be at least 6 characters.","error");return;}
  const button=document.getElementById("authSubmit");
  button.disabled=true;
  setAuthMessage(authMode==="login"?"Signing you in…":"Creating your account…");
  try{
    const result = authMode==="login"
      ? await supabaseClient.auth.signInWithPassword({email,password})
      : await supabaseClient.auth.signUp({email,password});
    if(result.error) throw result.error;
    if(authMode==="signup" && !result.data.session){
      setAuthMessage("Account created. Check your email to confirm your account, then log in.","success");
    }else{
      currentUser=result.data.user;
      await onSignedIn(currentUser);
    }
  }catch(error){setAuthMessage(error.message||"Authentication failed.","error");}
  finally{button.disabled=false;}
}

async function logout(){
  if(!supabaseClient) return;
  await supabaseClient.auth.signOut();
  currentUser=null;
  document.getElementById("userEmail").textContent="";
  showAuth();
}


let mobileTab="home";
function isMobileUI(){return window.matchMedia("(max-width:700px)").matches;}
function toggleMobileDrawer(open){
  const el=document.getElementById("mobileDrawer");
  if(!el) return;
  if(open){renderMobileDrawer();el.classList.add("open");}
  else el.classList.remove("open");
}
function renderMobileDrawer(){
  const panel=document.getElementById("mobileDrawerPanel");
  if(!panel) return;
  const engines=[["OS Health",()=>{toggleMobileDrawer(false);selectOS();}],["Personal Engine",()=>{toggleMobileDrawer(false);selectLayer(1);setMobileTab("home");}],["Productivity Engine",()=>{toggleMobileDrawer(false);selectLayer(2);setMobileTab("home");}],["Domain Engine",()=>{toggleMobileDrawer(false);selectLayer(3);setMobileTab("home");}],["Life Engine",()=>{toggleMobileDrawer(false);selectLayer(4);setMobileTab("home");}]];
  panel.innerHTML=`<div class="sidebar-title">MENU</div>`+engines.map(([label,fn],i)=>`<button class="item" id="mEngine${i}">${label}</button>`).join("")+`<div class="divider"></div>`+`<button class="item" onclick="logout()">Log out</button>`;
  engines.forEach(([,fn],i)=>document.getElementById("mEngine"+i).onclick=fn);
}
async function setMobileTab(tab){
  mobileTab=tab;
  document.body.classList.toggle("mobile-tab-home", tab==="home");
  ["mobileNavEntry","mobileNavHome","mobileNavStats"].forEach(id=>{
    const el=document.getElementById(id);
    if(el) el.classList.toggle("active", id.toLowerCase().includes(tab));
  });
  if(tab==="home"){
    workspaceMode="overview";
    currentItem=0;
    hideWorkspacePages();
    const home=document.getElementById("mobileHomePage");
    if(home) home.style.display="block";
    document.getElementById("systemPage").style.display="block";
    await renderMobileHome();
    return;
  }
  const home=document.getElementById("mobileHomePage");
  if(home) home.style.display="none";
  if(tab==="entry"){selectEntry();return;}
  workspaceMode="overview"; currentItem=0; currentPage="entry";
  renderSidebar();
  await renderWorkspace();
  if(window.initWritingWorkspace) await window.initWritingWorkspace();
  syncMobileUI();
  if(isMobileUI()) await setMobileTab(mobileTab);
}
async function renderMobileHome(){
  const list=document.getElementById("mobileTodayList");
  if(currentLayer===4){
    const scoreEl=document.getElementById("mobileHealthScore");
    const labelEl=document.getElementById("mobileHealthLabel");
    if(list) list.innerHTML=`<div class="mobile-today-row"><span class="mobile-today-name">Life Engine</span><span class="mobile-today-val">—</span></div>`;
    if(scoreEl) scoreEl.textContent="—";
    if(labelEl) labelEl.textContent="READY TO BE CONFIGURED";
    return;
  }
  const scoreEl=document.getElementById("mobileHealthScore");
  const labelEl=document.getElementById("mobileHealthLabel");
  if(!list||!currentUser) return;
  const today=getDateString(new Date());
  const names=currentLayer===2?layerItems[2]:personalGroups[0].blocks.flat();
  const packs=await Promise.all(names.map(name=>getEntries(name,today,today)));
  const rows=[];
  const scores=[];
  names.forEach((name,i)=>{
    const entry=(packs[i]||{})[today];
    if(name==="Sleep"){
      const q=entry?.quality?Number(entry.quality):null;
      rows.push(`<div class="mobile-today-row"><span class="mobile-today-name">${name}</span><span class="mobile-today-val">${q? (q*2)+"/10" : (entry?"✓":"—")}</span></div>`);
    }else{
      const done=currentLayer===1?isHubSystemComplete(name,entry):!!entry;
      rows.push(`<div class="mobile-today-row"><span class="mobile-today-name">${name}</span><span class="mobile-today-val">${done?"✓":"—"}</span></div>`);
    }
    if(entry && !isOverviewOffDay(name,entry)){
      const s=scoreSystemDay(name,entry);
      if(s!=null) scores.push(s);
    }
  });
  list.innerHTML=rows.join("");
  const avg=scores.length?Math.round(scores.reduce((a,b)=>a+b,0)/scores.length):0;
  scoreEl.textContent=scores.length?String(avg):"—";
  const band=healthBand(avg);
  labelEl.textContent=scores.length?({excellent:"EXCELLENT",good:"GOOD",okay:"OKAY",attention:"NEEDS ATTENTION",critical:"CRITICAL"}[band]||""):"";
}
function syncMobileUI(){
  const on=isMobileUI() && !!currentUser;
  document.body.classList.toggle("mobile-ui", on);
  document.body.classList.toggle("signed-in", !!currentUser);
  if(on && mobileTab==="home") setMobileTab("home");
}
window.addEventListener("resize", syncMobileUI);

async function onSignedIn(user){
  currentUser=user;
  hideAuth();
  document.getElementById("userEmail").textContent=user.email||"Signed in";
  renderSidebar();
  await renderWorkspace();
  syncMobileUI();
  if(isMobileUI()) await setMobileTab(mobileTab);
}

async function initializeApp(){
  renderSidebar();
  if(!isConfigured()){
    showAuth();
    setAuthMessage("Setup required: add your Supabase project URL and publishable key to index.html.","error");
    return;
  }
  const {data,error}=await supabaseClient.auth.getSession();
  if(error){showAuth();setAuthMessage(error.message,"error");return;}
  if(data.session){await onSignedIn(data.session.user);}else{showAuth();}
  supabaseClient.auth.onAuthStateChange(async (_event,session)=>{
    if(session && !currentUser){await onSignedIn(session.user);}
    if(!session){currentUser=null;showAuth();}
  });
}

async function getEntries(systemName, startDate=null, endDate=null){
  if(!currentUser) return {};
  // NoPMO is a rename of Nofap: preserve every legacy date and payload.
  // Merge old Nofap rows with NoPMO rows; new NoPMO rows take precedence only on matching dates.
  if(systemName==="NoPMO"){
    const [legacy,current]=await Promise.all([
      getEntriesExact("Nofap",startDate,endDate),
      getEntriesExact("NoPMO",startDate,endDate)
    ]);
    return {...legacy,...current};
  }
  return await getEntriesExact(systemName,startDate,endDate);
}
async function getEntriesExact(systemName, startDate=null, endDate=null){
  if(!currentUser) return {};
  let query=supabaseClient.from("system_entries").select("entry_date,data").eq("user_id",currentUser.id).eq("system",systemName);
  if(startDate) query=query.gte("entry_date",startDate);
  if(endDate) query=query.lte("entry_date",endDate);
  if(startDate && endDate && startDate===endDate){
    query=supabaseClient.from("system_entries").select("entry_date,data").eq("user_id",currentUser.id).eq("system",systemName)
      .gte("entry_date",shiftDateString(startDate,-1)).lte("entry_date",shiftDateString(endDate,1));
  }
  const {data,error}=await query.order("entry_date",{ascending:true});
  if(error){console.error(error); alert("Could not load data: "+error.message); return {};}
  const mapped={};
  (data||[]).forEach(row=>{
    const key=normalizeEntryDate(row.entry_date);
    if(!key) return;
    if(startDate && endDate && startDate===endDate && key!==startDate) return;
    mapped[key]=row.data;
  });
  return mapped;
}

function engineForSystem(systemName){
  if(systemName==="Outcomes") return "Personal Engine";
  if(systemName==="Productivity Outcomes") return "Productivity Engine";
  if(layerItems[1].includes(systemName)) return "Personal Engine";
  if(layerItems[2].includes(systemName)) return "Productivity Engine";
  if(layerItems[3].includes(systemName)) return "Domain Engine";
  if(layerItems[4].includes(systemName)) return "Life Engine";
  return "Personal Engine";
}

async function saveSystemEntry(systemName, date, payload){
  if(!currentUser){alert("Please log in first.");return false;}
  const {error}=await supabaseClient.from("system_entries").upsert({
    user_id:currentUser.id,
    engine:engineForSystem(systemName),
    system:systemName,
    entry_date:date,
    data:payload
  },{onConflict:"user_id,system,entry_date"});
  if(error){console.error(error);alert("Could not save data: "+error.message);return false;}
  return true;
}

function selectLayer(layer){
  document.body.classList.remove("os-health-mode");
  osMode=false;
  const osPage=document.getElementById("osPage");
  if(osPage) osPage.classList.remove("os-dashboard-host");
  currentLayer=layer; currentItem=0; currentPage="entry"; workspaceMode="overview";
  document.getElementById("layer1Tab").classList.toggle("active",layer===1);
  document.getElementById("layer2Tab").classList.toggle("active",layer===2);
  document.getElementById("layer3Tab").classList.toggle("active",layer===3);
  document.getElementById("layer4Tab").classList.toggle("active",layer===4);
  document.querySelector(".os-tab").classList.remove("active");
  document.getElementById("dashboardTab").classList.remove("active");
  document.getElementById("analyticsTab").classList.remove("active");
  renderSidebar(); renderWorkspace();
}
const OS_HOME_DASHBOARD_B64 = "PCFkb2N0eXBlIGh0bWw+CjxodG1sIGxhbmc9ImVuIj4KPGhlYWQ+CjxtZXRhIGNoYXJzZXQ9InV0Zi04Ij4KPG1ldGEgbmFtZT0idmlld3BvcnQiIGNvbnRlbnQ9IndpZHRoPWRldmljZS13aWR0aCwgaW5pdGlhbC1zY2FsZT0xIj4KPG1ldGEgbmFtZT0idGhlbWUtY29sb3IiIGNvbnRlbnQ9IiMwNTBjMTMiPgo8dGl0bGU+UGVyc29uYWwgT1Mg4oCUIEhvbWUgRGFzaGJvYXJkPC90aXRsZT4KPHN0eWxlPgo6cm9vdHstLWhlcm8tbGF5ZXJlZC1iZzpsaW5lYXItZ3JhZGllbnQoOTBkZWcscmdiYSg0LDEyLDIwLC4zOCkscmdiYSg0LDEyLDIwLC4xKSA1NSUscmdiYSg0LDEyLDIwLC40OCkpLGxpbmVhci1ncmFkaWVudCgwZGVnLHJnYmEoNCwxMiwyMCwuOCksdHJhbnNwYXJlbnQgNTglKSx1cmwoImRhdGE6aW1hZ2UvanBlZztiYXNlNjQsLzlqLzRBQVFTa1pKUmdBQkFRQUFBUUFCQUFELzJ3QkRBQU1DQWdNQ0FnTURBZ01EQXdNREJBY0ZCQVFFQkFrR0J3VUhDZ2tMQ3dvSkNnb01EUkVPREF3UURBb0tEaFFQRUJFU0V4TVRDdzRVRmhRU0ZoRVNFeEwvMndCREFRTURBd1FFQkFnRkJRZ1NEQW9NRWhJU0VoSVNFaElTRWhJU0VoSVNFaElTRWhJU0VoSVNFaElTRWhJU0VoSVNFaElTRWhJU0VoSVNFaElTRWhJU0VoTC93Z0FSQ0FEMEJnQURBU0lBQWhFQkF4RUIvOFFBSEFBQUFRVUJBUUVBQUFBQUFBQUFBQUFBQkFBQkF3VUdBZ2NJLzhRQUd3RUFBd0VCQVFFQkFBQUFBQUFBQUFBQUFBRUNBd1FGQmdmLzJnQU1Bd0VBQWhBREVBQUFBZkxYSlhzZVdPaVVBN2t1Z1p5WEdNaTBJUkdJQW5NUXhVVzRCSTdvZGVyRG9LOXozUUNqM0FCV0RqcjNQU0FYT1F3VWU0NjlXS1JYUFpPbldLMWNkUzlzNDZwN2JwT3A2dFhIVnZhT3FxM3RIVHErck4wNnhXbmFxb1Z3NmRLMTQ0Nk5YcnFxRjc1MDZCNzkwNkI3OXdvSHYwblJQZXVGQTJoUVo5NzlCUVBmSk9pVjh3VWIzblE2QmFIcFBPdm9YVloxOUM2TTYraDZIbk9kSzZNeXRNd1pwOUloNTNyUUpQUHEvU0tCcjlnb212VXlnNTBMTlo1dEN3WjU3OWdvV3ZtQ2hWOGdvVmZKcWhhK1lWRTE2elZHcnRncFZjczFUdGNNRk8xd3pWTzF3Z3AxYnBxbmE1UVVxdWtLbGU1Y0tWcnQwVWozYUhTdmN1S2xhN1E2TlhhQ2tWMHdVcXVrRklydE5ValhhQ2thN1lLVG04WnFrVjJncEd1MkNsYTY1YzB5dUVLbVZ5bXFWcnBDcFh1VUZPOXgwRk0xNmJHbVZXeDd4Nk1nZnFpT1B2ekp0eXVYdENrTWhqUUFTd2c2K1BOZzdtdzI1Zk1KUFh6dVBxOG52OW5YOC9hTnp3TTY4NGNqcjdENEFkeVhHTTVMb0djbERIY2hESGVkSWhSRGpIY2pvQm5KZE1aeU9oaXVWMGdSeStrQnVZNHczTVF3M01kTVJ6SEdHNWpqRDZLU0JuSmRNWG9oMVE2SmRNZEVvWTdrT3FHY2gweHVpSFRnNm42VkR1UTZvZEVKT0RxVjA0dXBPazR1cEhUamVSMVVhbGRPTlRkVFE3a09xR2Nod0hSTGdNaVhUSFJLR081Q1RIY2hTNEVRazRGTzRRTk9rNEZPeklXblNjQ21RUU1Rd1FNUXdRTVFoaklsbWhtSllCMklZQjBRd29GT3pRN0VJQjJKNGFnNUlZQjJKWUIwUW1EY2xvUWJHTXdSRnBvTnpFSU5HTUlSRk0wTWlXUU1pV0FkNTBPRlRvSUZPNHgrU21FTTVEZ09wM0NEa2xORE1VZ0ZZcENGUkxBT3AyRkJ5U21oV0xrSFhjMkhjdXNlemxqU29rMlUzbmVsaW85cEtxd2piMkVlSjYyY2xSa0R0TDFPMWRaenplZDZGZEJlemMrMlViVkN2T3V0UVJkTXRCemx4ZFkxVmJtUU83ajBndEJ4MjhOeEJVY2RQSFhkRjllbjRvYmx1TVZ5blREUmpERWNydE1OeWtBL1JIU29aR0pNVkU5REdjbnRBblJxVEQ2TTZBSnpYVEJjMURDYzF3RGN4MVFmUmJwaU9XNHhFWWt3M01kTVJ5blRFY3RKaW90a3hVVTZZcmtvWXprdW1LaWtxRlJTR0tpM1RGY3ZwTVJ5M2xpOUVkS29ISVUxQjFNazRubGRWQzhycHdxZEp3S2REaFV6b2dlWkp3dk1rNGxLaHhLVndoVXlUaFV5Q0ZwMlRoYWRCQXhERGdSQ1FPaUdDQlRvSUdJWm9kaUVBNklRRElwMEJzZEtuV05lY3hkSzJnN1N6VDZLeGlzb2RyalBONmNPQnRxclRYT1FYRUhvY3RZclNhczZacnQwVVhOODAxUk5vbW1zNjEvSFNwVmF2YzFUMmpCV3ZlVDUxblcwcEFzbHpwNjJvcVduWFRseTNjVXN0NHo4ZGhlcjBuajZjYkJ1QWRjc256ZnpheG1uMXhHR21NNzJYVWFaYWJXVGN1Mkp0ZE1SbFZBWmV5Y1YwblZ0ekVBeXkxNEVSNVhQOWNlbGorWFZuYmo2YlRlYzEzcWNYcDBmbGszZndlbWwrU1ExbjZjRmdGdno3cVBEbGE1YXhVYzRyVkRTRGthSWdPT1Rpb3VvY3g5K2NOR09tQzVxQUpIT01GejBtRDBhNllYUmpwaUl0eGlPWjBxRTdLNmxqZEU5VFF2UkxwaXVVNm9SeTNBUnpPbFFibU9tSTVicGlJeEppT1dsUWlNU1lpTVNZVG1KTU56RW1HakhURGN0MHhFWWxRYmx1TU55MGdWeWtBemtPbU9pRXFnZVpKd3ZLNDRWT2s0Vk02Y0NuU2NDSVFRS2RKd0tkSWdVN0ZRcVpKd3Fad2dlWkp4S1ZKeEtaRGhhZFM0Rk1rNFduUVFLZERoVXpvZ1JDR09wM1JBcDBFUFVpVFNTbXBlT0Vxbk1yRm5WMTFSdmlXMGRkMDNhTldzbmJTVXFtcnp1ajZoNkdUTnJPTkpMbFpWT200cFh5ZHExZWRsWE1KL0dUckJyYmhkRkxIZXgxclNSMm8ybTlRSGFoZEpVQjMzWFh5NXRhWHE4cytiY1N5Nm1jMTRxSXpvM24yQ1Z1Um5OYVdOWFZob3BjaWpIVlZ1Ymg3ZWZRVm9TN3VleWF2ZW9MYUt6dzFCTHJNamwxYWJBU1E5MkZTTmR4K2w1RkZGb0pkTWN2eHNFMWpYMXM0c2ZQcnc3em95RE9MejdTaG03Q2F0cnN0dGpwL0plY052VTZ2enlJTnBTMFhIUnlldzlFZGFRTTVMcGpPVDBNVnluVEZjdDB4RVgwbUU1ampENkxkTVRvcDFRdlJMcGpPU3BjQ25kT0I1MHFnZWR4dzlUUE5RcWRKdzlTdkxoZVp5b2VwWFJFOHJweE1Rd0R0UjZDSHc1REZRUE1oeEtaMDRFUWhqdVF5SUdJWk9CVG9jQ21TSWxLazRWTWh3dk1rNGxNazRYbFE0bE1rUktWSnhLVklqVWlWUk5NazRWSWh4S1ZKeHJ0MDQxSWg4S1JKeEtaSnhLVnBjYlNvY1NrU2NhbFlPR2tRUnZJa1JxVkJHcEhUaFVxWkU4aUZHdTBIQzdRbzFJN1VTbGRFTFQ5Smo5RmR4WWZSczhGZVNmSmhJQlpaV0VpbDljWTR6eUNLTXkySGFWS1BLU09uYTRITlFvekp4MDNGK3hWQkxlRDA2M2tpSFRTUHFPT3RDNFlBTkMySng3ZGVXNEd5U3ZIVHcwTWpDSW9tdXVhMjBrMW1tT0lDcFNSTnpOeFFrODBDUm5OcmtBMWc5NWhFVFdPZGhqYUVmdy9YdzlIdnF2c3J6OExaMDN0ZUZRY253OTNtREtaWGxETDF5cW01SFUxTHdwQWc1S2pwZXc5U3ZNUlBQMG1PaVhRTTVLVEhlZEtvWG1TcUpUdW5BODZUaGVad2dVN3pVTHpPbkM4L1l4a1YwZ1J6R1ZDOVNOTmN1dzRFVnVDeW5mNWV6dFBJTFRmazl1eS9tQmVIUjZseDVxK3M2SEgyOWYxY1FQcW9PMStTK29qc3F6anpQY2tFcUtQM2ZGdjloNFpvdHN2WDJ4Y1hCNmUzNXoya3ZMaHAraER1UWdIUkNBZFRwT0JwME9GU3BPSlNwT0o1WFRpVXZTSUZPeWNMRUpNZGlHSEFwMm1vVk13UktWRGlVcm9oVXpwd0tkazRtbFpWR3BHVGpVanB4S1pCQXAyUkVwVU9OcEdEaGRzSEM2VFhLNlFjcDBKazZhWm5acEpPQ2RrTHArRUVqeHBFclJJSlZEeUJEUU1FcWhacWZtRm1UZGlwTWhvRU0xZzNsVE5FTzNZa1VmYzFvWnN0eXAxSkdPWnp1T2NRcFd5anlUczBiWi9xbHF1TTBwV2pob1hIYzE0c3QxendWd2dkQjBXMGFwdk9nTzdrOVVyL09PZEkzc2VHbXFkemIrZm44UGZ1WmNQVThtM3BZZmxRM1RodUtIUDhlaHhXSW8zUFZ4OXhwcno1NTZUbUpTTTFHblpwMjU0YWZoY1ZuN3ZGQUx5ZGxxOUREVTZYbk10VTZrbklkemV4NnlFMmVtcDd6UlVYZUtsNlZXL1ZWTE5XQ0Q2VEs2SGttNVZHb3VUcXN4MnVIbzJWOGZ4UHBlTDZJK0dMOVB4L1JyL3dBYXQrZnI5RzhyNWwwekQwdEhaNllWdDkxTk9oSFVyVFFaNDFpRkhJZGpuTnp0L01GNS9vZStIZWRhajRYOUYwVmZRYTdrcWt3SHM1ZlY1L2tadTRqMjA4dTJHaHJTOWozaGpOYzlXM21RM29lZDZzM2ovck1YSzNVMmV3NkpjQm5uZEVDblNJRk02Y0NtU3FGNWtpTjVFSERTOGk0YWRBTXdOUnZqb204eHpmWnhlelozenFYbzUvWGdmSzRJcjJheThUOUI4VDNkVzlUYmMzU25sZlRPRjVYQ0ZwbVJFMGpKeHRJaHh0S21SS1ZOUXFaTWdhZEpESWhNR1JIUWhuSzVTSFUzYUJrY1BLZ1JNd3E1V00xVFVOZUQwcWxqbmVsZXJCbWdIUDRBTkVzTWRpWFlLeEVZNDEzME9HTW1DS0RoN0JlNWIxayswSGRWc3BCeUFGYnVsVnpSZG9SVkI4bWwyTGk0dXpIMFNYemJ1VDBkOEFSd2QxL215TzlMejhXdEs2T2JDUitnRFZqaDMyWE9oajVkVEVyejNHaFoxUlRYRW1lbWRoMXN5TVgxdCtrWUZ0ME50ampscUlkOGMzRnBlZE04eHpwM3FNbzJ2ZFZqbzluRmVXTzUxVVcvUHY1aUZyNThDSzZRRnpZOUNxMWJkRHB1TDU1ck90cE9GZWJiVWN6V2E2MFhLdWdlOGRPbGtDODQ2dUwxZnk3QjBmcGVLWUFhM28rTkhweDRtMmh1WmtaSW5VRmp6MWhlZHAxQkpzVTJOYXlVdVBSZTlZY1RibjJYR1FFcWJJU29KcVppcUpTOU9LSVpsc0xiMGs3VzQzM2laWG1lcjdjK0lzT0x2M1hmbjBHR20rRHdzT2ZUNkhTVVVBY2JMSWdheDZGcGZIUTg5dmVqdm53Wng5SHJ3UFpZYWVscnkvUTQ2YkI4aFlSZWdldGdWWEt5dEh2eitqVlhpR2Y5SHp0OTVwb0lQVzhtd3RNNFhPa2xnS1czSUdFYzFLZjNGRmlkZERWQXVyemN1V25vd1dKZnhmWDNWdjVMUjc0Kzc1ekREOG5aNmViOC93QTNady9UNytLYkh3Zm90MjFaYTh6VVhYS0VtWXQ1eHVSV0hBS0ZhbDBIVTVYYjBpem0zcTNsenFFTzNVM25vOVAwdGN3Um9PQlZ0d0l5NTd5dmc2T2FCNVNOTng1Skkzbk5JRkFCOFlyelNFZUZkUUVObzIvWFN5V1RhV0hIWU9pcGp1bWJweVRtRUQwV3ljVVJMSmljbU1xQzdMNnlCb1R1WVFYSk1OYUN3bnRldGM5Z3FZazB2T2FqaW41YkhVamFEc3VpZU91K0dPejlwSlJ4Qk8xYkRwRnB4RkpHeTRpNTFsRHFIcjVWekxIdGc4Z0kydVYzem4ySGJpZ2Q3NDcrVE5MMGZCMDNlWTZtdFQxbCs1clRkK2YwRlpleFp6d2pOZHZtZW1ZMFE3MC9HMTkxZ0RvMTB1MDgxanowM1dHQXBOTVRaSmFIYm5wYkM4aFZkemc2RU9JYllzZU12Ym10bXJBK3FOODMySG85YlU1YVlhdjA5TjZIbFhXbG82M3kvWTF0UG90TjRmMG5qdFQ3cHo2WGtlRjJIdDVmWjV2aXBuclEvZHhZYk9lZ1pycjVjeE52VEU4UmdmZHNDMVhWMWdHbHF0ZDQ1ZHhyNnFCaGROR2wyNS9VYTAwODhRYzUzUlFoVEM3R1FQTzZ2MVo2ejhqTDlTVng1clpiU0thb3BMTE54cDFVVFhWVGxOWWZjeHJVejI0MlcyWHQrN2NLRlc4MDZCNXpYY3AxRDJnd0M4MFdmMzVONkY1dFBwajZCUzRhUzg3M1ExVzMrZCtxeXRyVzQrOHRibXBnZlk4TDBVTER5OC9WNi8xNUx6eDkzdWZYZ1FheCttOUI4eVhuamU1OUF2NGJaWWIrd3FsbTRleXphdDVkMmlxb203cFVrYldnV2RtcDNpcVdKdG84eUxkNi9yR3VqWWM0emdOdXNZS2phY1lodEZ1T01VN05WeG1PcU5YTmtIaXRYeG1IVmEwekV5NGFiM25DUjR2Y3dZOTFwcStzZElyMVRVTXZPV2FxWW5wcENNdjJzdGZOaUk0eTIzT0g0cDZzSE84YmJhS2JLclEwNzVqa2V1Q3pyWG5iRGdjOUt0SktialNkS05uK1pMZUtxYmJPMENIYmJIbU9UbmZuNTdqNUZ4ejIydVVhN2E0NWJ0TlJydHhSOHo5Q0U1UGNWYzFtaDVHVWFQNnY0QSsxODZwODlQVTZqS3hFd1M2bVBibXpoa3NWVGJBaXUwUkpLZW5sVHR0Y3hlU3NMbXhWZ0JhR25tcU80cm9NOXRuVDVlMDh6MUs2aDFGWnBPZDlIdzlsSFRIc3NKb2xQcU9lQXpYejMwdGlmblF2cWZqdlFhbXZwc3VteTJHT0k1ZXpVdGxPL0c5L1M2THlLcldYcytuK2JBTitUNjhxdmt1RHU4ZjM0THd6djFPRDNaVUZyNVgwWmNEbStwNG1XajJrblg1L2t0TDdrQmVmak8xdTRwcThLdytzejNzWGVybXJGOHozVWFIaVBpTkNIVW80SWpPaGhOWU9nU1NhVk1kRjA0R1Bnd2RNZlNqUEs3eFZ1T2NobGs5M2tNaE50emVpWkNsY20yRUowbm4rcGtTckt5VlZSYlZ6cThwYlN2alVLL29hN280eVlMMG5mREcyZk0yblBUV28ybW00WnVhS2I5Q0FtNytLKzhvNVlRUFQ4d0hSRTUvZkhRN1h4QzMweTlwSThaajR2UzlxNThnNHowOWRqOHJxU3ZhT2ZEOXpoMWJkNnpTZVQ2NEwyS3hxdWV4Wk92VmcwdXU1c2tpc1ZtcHFzZXpVT3Vld2FHQTV5bGdvMVFCdWErUUM1M1djZ1BZZFFxN3F4NmlhNTdGNW11VmlvVmNySHVWV05iTTFUOFhQR21sTzFwSHJwWGNXRWVtZ1hCbk90aE1hMnpBanNscVZmTnF0SXArYmZuVlZEVzNPc1ZYTnMxeFVxNGVvcE9iN3RyTzg2bnBUayt0V2xPVjYwMFZsQXJ4NktOYUtTRm11OUJ5UHhMTHpuZnFQNHBTdHRDQXdWLzZGWlo2K2UwUHJzczE1VGU3WktzYmJrVWJXdlZEY0prZzFlUmEwdVR6MFR6bGhSSXVyQ2psalM0Z3JaRXl1bW5BUjRvcnpJaUdzeGk5bWFTcHlKdDlTdEhEMVlTcTNxNE9nZzdMUFNwR3NTRTZjcXlFVEZtT2dxWWhaQjVxVFNaSzg4NzF0b3czWHpQNkJOR1JGV1JWN25ZZXZnM3hmbVZoMThPOWh5ZHZ2eXlQVEVkL2xXUW5FZTNPZFBROEVseGprM2xvTFBQVXVldTNBOHB6S24wTEswMDE0OFhBUGQ1aEdpTzFlSFZWK3J5WjlyMVU5QVdIUTZnSFV3VFdaMEZSb3ZQOEFTOU1zd0tuNEQ5TXY2ZVErNHFhalN5ZDNCNXpWK2tpZXo0V0ZqOUd6bmY1MU5WMjNvSFp3ZU4zK2x2bWVheWJpcERQNmEwSjVPM001L2Z0NS9xK2FSNnFoOUh5YTZVM2pvNUpSTFFZZE1kT1ZlWXdVOHMxeHBNSVZ4OWVybjBMZkxmWjFWOVYwNVhvZDk0ZTg4dnZ6ZUF6OHRlNnZoalBHN05jcWcvaHNseGhaTE5ZcXgxblN2MFQ1V3d2WlhTbU1tUHFjcCtobldaSFliV3JMa0JWRnFUUnlQSzdscEo2d3V1NnFmbzV6b2hoMkd3Z3c1ZEJzUU1XZlRhaUJjTFdma2FNNkNJSW9xMjc1aTUyMks1RmEzTEd5MjA1NGxXdFFxWnRLamFUbTNHdStkWHp6SXJmQzdlaU5wV3RRY2tOb2gySVZvZHAycFlDZWxwLzAzOFkzSFhsOUlMMktyOHI1YTlCcTg5cEVxd1haNWRNNi93RExlazl6bEs2VUk0OVREVVViYlh1bGo1dDNUemVXN0pUbXRzYkhhTTh0cy9VZzJzNWFIbktzM0pGV0RPcXN1SEpZVmlTU2V4NHVZQ2VPeERLNnRadkxFNzdITlZFbGhZTlp5TFJDT2FWckhRVFdMdGl0aGowQlQrZjllVDlENktMbGUrZnUxWE9SNnk2cnV3cEpVN3lLajdoRUZEVHJYdUdTRzUxRW1YaDM0OVRSVnZmbytQVndhYzNxNE1pUnVEZWpqODI1OVBOMHk4Mm0zZ0xQUG0yeDZlRGszaEdlMkY2M1BjWG0rOTA4NmVkVmZyM2N2eDZxOWtJVDhIc1BYTVRTeWs0a0d2UFpja3hOUjgxdk41U2Rjd3RXMTdpb1lyMTByeGJ2TGIzYnJ4M1FUcnFDNk91YjBQcDN6bEw1bnBldTJuaXZQSDZIb2Vhend2cWVWYXRYV1hYdzg5MjFTeUMwcG52T1cxcWdFN3NqSWRjdlY3Ukw0cHNQbVBzTlBReTJyNk1SMzZKUyt0NFdOdjdDdDZ1QWl2WEVhQmQyVVRRa2N3MFZvN3ZIR2VGOUg2bG8vRnIzNTNxOW1uOGI1ODkrekx3NFRYazk4WGp0cmpYcDh2bmswdjBRenp5enZMYmtZenZYbjNSV1dzL2I4eTc0aTU5YmlqcjFVZk4ra1ZBTlZmUGVsYngwMFBQMFhNSWI4MVN4UTkzZk1kVy9YZGh6eFY2ZGx0ems2ZjBkUFExNStOdkhwTGVhMnJqYWNacFkzb2VjckZzOWErRXArdlAxR1h5R1RweDlhWG0xcGhwdE9jMzNsMFh6VUVlaG8xbWEvZlB4THYwS0w5TC9BQ0hDWEdocjJ1UmhhcHp0cUhOUlN5T0l5QTRzQmhWVnRkNXNVTnZSVkNxZEZxZk8wUGNCNGpwUDBMTDUvcFAwUEgxdklyNjNwRXoxL3dBanFBSlpQUTcxSGZmRmdIUFZucUdoZFptNktkZGNaNTFJamFkWi9QRDBnRlVuT21xODhoUUZsNkJxajNFZFVWdk1iRFVpSEhsdVFveklNOGh1T2VjNklhQmdtYUFnYzQvS0gzMUR6TmtROWN5K3JTbmFidGdobXFiUlZTbTV5SzlYaElvMENuaDZHVHRjRDBWdXZUL25raWRmcVFyNU9QejZQcCtMNWR1RWZSRTN6Vm9adjNianplOG5hMXkyaGtGaTF0KzNPV3ZiR1REcURydEQzTmVlVTNyM2VtUGpOZjd6S244MndmVG5SUHk5ZmZRVU5SNGZGN25NcStlNGZvdU1yd3FQM2N6RG8rYUJ2cUlEVEw1cXN2ZEh2THd1dStqQml2blFmMzZoNk9UeHhiNm42T0xKdzYwcFBEeSt3WEhOM2VOWGZyd09YVGc1OWJEY1pjVFVnVkdmaXZZbFdmbktlTEdWMFh6OWVkNnVLdlBaaWdUTU9pZWFJZm03TGtuUHk4bmRxU01wTjUzbzYyWEtsOEhib3BjOVB4OVdobnl5d1d1anBSc0hvb000dWlya0NuajY1TERoQzlEa0loQWc5RHpyS0d2NDZ1RThjZHVqa2xKQWoxeDBvVkZDNTJQZUdpdU56YStXUlZqNmMzbWNqZm9uT0x2STNzNDNLallQcWJUUFBHamV3VG84VG45bWJUSHgyRDErczB5ODRiMW1Obm1NZUVrK2orSzFsWG53NUxrU3NraXlYaDVEcFJPanRjdXlSdVdhbTdGUXBHalNxYm1KeFNOejJFcnd0VXU3ZEF5N2tEaXhnQWF1dXFCazd1ckdhTDZYS211dTRVSGJjZGgwUkQzcENNRDRwYWliS001MU5mUU5ORzkxNm1qQmVXaXUxeTRuVE94Mlp3VHNna1p1M1BEcHg4SW1FR2FWZ0hSa3lkWjJkQUhEVFFOUnQzMHE0WmRJYVVkZ3N1cW9wb3VCMkE2cGUxVlZuRm9RT2ttSWhxZEpKa2VDdlZyanc5UnA3bzNqU1Q5ZFA4TEpaN3JQNC9PdFBZSi9QeUkyMzB2bnF6MjlFZnptU0s5RDZ3aFVhN1NYSFM1NmJHVEhkNTY3S1RGeTU2N1NUR1M0NzdCWlNiTGZTeFVra1dZTXphNHdSeng3NGRJZUJ1YXBJSHFhd2UzSDB5ck9KNjdUR1NHdDR2TTRTR0dvdERxR2JQVzFEa0x6M294cklDb0l2c2J4bHQ2T1Y1alB6ZGUvaHhGdGgxR29BS2RMMkdxTnc2TEdYT2Q0YjdHS2tiaTdwSHBJdlE4elFpVlNhTmV1aDZlYTFnQzZxT3g1T04rYUNLYURvNHVPVnh2eWRjeHJUSHBvK05NcHVZZWF6azVqNXJPVm8ydk9WNGs1bGFKT1NpYXRoMnZkUXc5RVBSTUszNHFrS1RobTM1SGRtQmNKVFhMZHNueTdvRXpvRWtocG5RbVhhRGwzVFNUY2o3NVprMzVkazB6cENTY0dUdUxsZElPVjBnNVhTWnczYUh5NlNIWjJCazZRemRPSEM3Nlp3eERWTUx5SkViOXN6bnA1Qm1SdDNTRmowdzZLR2F5N1lCTk5JMUJEWlF0Y1JLRkFhazVtb3VaK1VSOHpPRVQ5c0ViU01QaG5hRzdNaHV6b0hPQVFIaDhvSnVvSGFJZ2RtTHVicHpDL2NnUXh0d21YWVVhSG9wY3VtOWVSaTVnM0VtRlJXNWJEb1c5STg5bUg2QVY1ek1xOUlsODBVNmVwUytXeXpmcHorWWN6WHFYSG1QY2FlamMrZHhzOUlpODQ3YTNRR2RJcEhjQThWbGFGWjJFTmtzU2cxb3VhaVJjMTRYRGt1YXVjTFVpazZqVzNub1hqUzFqcjBtZHdFbFpmSTZtckZBUG5zWExYdk5YbmRMMXpkaGtZWEhSeUhQWHZVSGNob0NlUitiZ3pvRk9iQkFkS2lvNFZVU1JMbThtNGZqVEZkeDgxbDFEMDFSeXp0VU1rem5wdWVnZGNzMUp6d3dkTWs1VHB4UnNraDJTR3pKQW5TQkpJU2RJYVNRa2ttT3lRbVpKVXpKSnBKQWtrTkpJRWtoZEpKcEpJR1NTcE1raGtrbWtrQ1NRbmRKaVNURklsVXBKT2VtU2x4eXBEaWRJb29oSzQ2WkpycUpJVDhwS3VXU1RqU1FjeHBTTTZRSkpBbVNhZUZKVXpKWjJuU0JKSnAzU0VtU0JKSUV5U2ZQS1NwamtrN2V2U2REUnBWbjBrbkxjcEFuU2w5T2swblNvZnRKdy9LVEdTUUprZ1RwSnYwazA3cENrNlNHL2FRZDlwRmNScEJ5eVNiTWtxZnRKTnVrbFhTU0d6SlRTU1NwT2xOcEpKdTZSWFhTV2UzSENWNXM2VHpUSk5KSkNiaEtwWkpDNmRKVTdKSnNrbWt5Vlo4dWxlZk1hVGxtU0V6cE9YWkppZElFeVRUcEpyLzhRQUxCQUFBUVFDQWdNQUFnSUNBd0VBQXdBQUFBRUNBd1FSRWdVVEJoUVZFQ0VnSWhZd0l6RkFNaVJCVVAvYUFBZ0JBUUFCQlFMcmpPdU0wak5JenJqT3VNNjR6cmpPdU02NHpxak9xTTZvenFqT3VNNm96cGpPaU05ZUk5ZUk5ZUk2SWpvaVBYaVBYaVBYaVBYaVBYaVBYaFBYaFBYaFBYaFBYaFBYaFBXaFBWaFBWaFBVaFBUaFBUaFBUZ1BUcm5wVnowcTU2TmM5R3VlalhQUXJub1Z6NTlZK2ZXUG5WajUxWStkV1BuVmo1dFkrYldQbVZUNWxVK1pWUGwxVDVkUStYVVBsMVQ1ZFUrWFVQbDFUNWRVK1hWUGxWRDVWUStWVVBrMUQ1VlErVlVQbFZENVZRK1ZVUGsxRDVOUStUVlBsVlQ1TlErVFVQazFENUZRK1JVUGpWRDQxUStOVVBqMUQ1RlErUlVQazFENUZRK1JUUGtVejVGTStSVFBrVkQ1RlErUlVQazFENVZRK1ZVUGwxVDVkVStYVlBsMVQ1ZFUrWFZQbDFUNWxVK1hWUG1WVDVsWStaV1BtVlQ1dFUrYlZQbTFUNTFVK2RWUG4xajU5WStmV1BuMWowS3g2RmMrZldQbjFqNTlZK2ZXUG5WajV0WStiV1BtMWo1dFkrYldQbTFqNXRZK2JWUG1WVDV0VStiV1BtMWo1dFkrZFdQblZqNTFZK2RXUG5WajU5WStmWFBuMXo1MVkrZFdQblZ6NTFjK2RYUG4xejBLNTZGYzlDdWVoWFBRcm5vVnowSUQwSzU2RmM5Q3VlaFhQUXJuejY1ODJFK1pDTjRkanh2am1SbmpEQm5qRlliNDd4elIzRDhTMCtSeHFrdkY4YXdrNCtvTzQrdWVoQ040eHJ5SHg3Y2c4WXJEZUM0eGlPNG5pbW1wcWFtcGd3WU5UVTFOVFUxTlRVMU1HcHFhbXBxYW1wcWFtcHFZTlRVMU5UVTFORFEwTkRVME5EUTFOVFV3WU1HREJnd1lOVFUxTlRVME5EUTBORFEwTkRVMU5UUTBORFUxTlRVMU5UVTFORFEwTkRVMU5UVTFOVFUxTlRVMU5UQmd3WU1HcHFhbXBxYW1wcWFtcHFhbXBxYW1wcVlNR3BxYW1wcWFtcHFhbXBxYW1wcWFtcHFhbXBnd1lNR0RVMU5UVTFOVFUxTlRRMU5UUTBORFExTlRVMU5UVTFOVFExTlRWQ09UclBZZW9qM0tNbWtRU1dSVCs2aVJTS2VzNVIxZkE1aDBLNGJ4cm5FZkM1SStIamFKVlpFUGVqUjhqMUhiS0xFOVRVMU5UVTFOVFUxTlRVd1lOVFUxTlRVMU5UQnFhbXBxYW1wcWFHcG9hbXBxYW1wcWFtcHFhbURCZ3dZTlRVMU5UVTFOVFV3YW1EQmd3WU1HREJnd1lNR0RVMU1HcHFhbXBxYW1wcWFtcHFhbURCZ3dZTUdQeGd3WU1HcHFhbURCcWFtcGd3WU1HREJnd1lOVEJnd1lNR3BxYW1wcWFtcHFhbXBxYW1wcWFtcGd3WU1HREJnd2FtcHFZTlRVd1lOVFUxTlRVMU5UL0FLL0dEQmdWTW1wZ3dZRWpWVG9jTEhnMU5UQWlEV2pHRVVZa2VFVlVRVjR2YThTak5JUjhVTXB4c05HTkZsYTBkWkpKc2pwQlpGSFR1UVcyNDFOVFUxTlRVd1lNR0RCZ3dhbXBxYW1wcWFtaG9hR3BxYW1wcWFtcHFhbXBxYW1wcWFtcHFhbXBxYW1wcVlOVFV3WU1HREJnd1lNR0RCZ3dZTUdEVXdZTUdEVXdZTlRCZ3dZTUdEQmd3WU1HREJnd2FtREJnd1lNZm5CZ3dZTlRVMU5UQmcxTlRCZ3dZTUdEQmd3WU1HREJxYW1wcWFtcHFhbXBxYW1wcVlNR0RVMU1HRFUxTUdEQmd3WU1HcHFZTUdEVTFORFJWUFhlZExoS3NpbnB5RWRaV3VqUmlJdVRWemhLelZQVmFMVGFwODlGRTQxRDFHdFA2c0cyREQ1UnRWcG94b3IwYU90dGFPNUFkeUE2K092ajd5cU9zdlU3WGl5dlVWVi9HcHFhbXBxYW1wcWFtcHFhbXBvYW1EQmd3YW1wcWFtcHFhbXBxYW1wcWFtcHFhbXBxYW1wb2FtcHFhbXBxYW1wcWFtcHFhbURCZ3dZTUdEQmd3YW1wcVlNR0RCZ3dZTUdEQmd3WU1HREJnd1lNR0RCZ3dZTUdEQmd3WU1HREJnd1lNR0RCZ3dZTlRVMU5UVTBORFFTSlZFcU9VajR6c0pPTWJFTEN4QlkySWFtcHFhbXBnd1lNR0RCcWFtcG9hR2gxbWhvYUdocUpYZXAwS0pYZ09xdWRkYzFnSG9oZ3gvQkdtaEc2YU1WOXFRU3ZKbUpraURZRmNOcUllbWg2S0NVVVBUUVdzaDBvaHFpRDN0YVRXSTBKTFREMzlUNmNnM2s1ajdFdUpMczBnc2oxRlZ4bFRQOHNDNFEwTkRRMU5UVTFNR0Q5R0RCajg0TUdwcUl3NlRyTkRRME5EUTBORFUwTlRVMU5UVTFOVFExTlRVME5UVTFOVFUxTlRVMU5UVTFOVFUxTkRRME5UVTFOVFUxTUdEQmd3WU1HREJnd1kvR1B6Z3dZTUdEQmd3WU1HREJnd1lNR0RCZ3dZTlRVd2FtcG9hRFltbUlVTlVlTm9TdkY0eVpCT09uVWk0b1pRZ1lhdGFralVjczBLQ3dPT3BSSVZVOU9SVDBKRDU3ajBEMFVQUWFMVmEwNjhDeEtwNjZucnVPaFRyVkJrNnhudXlDWHBVRTVKVUpPVGpIM2E2ajU0MUdya2ROZ3pzTmFScTFCa3lJZXpnVzJoSllhNFZJbkRZWVJzTVlrUjY2cUpURXFvSlhhSkFnMkJCR3RReWdzaUhlaUMyMm9UY3JIR2xueWVHTWs4b2M4Znp5S1NjNUdQNXhDVG01RlBzVENjMjhkek15bjFaejZzNTlTYytsTVI4czlCdktNVVRrSTFJNW15Q3E0U0o3eHRkQnRjVGo1WEdwZ3dhbXBxYW1wb2FHaHFhbWhvYUdob2FHaHFhbURCcWFtcHFhbWhvYUdob2FHaHFhbXBxYW1wcWFtcHFhbXBvYUdob2FHaG9hbXBxYW1wcWFtcHFZTUdwcWFtREJnd1lNR0RCZ3dZTUdEQmd3WU1HREJnd1lNZm5CZ3dZTUdEQnFhbXBxYW12NHdoczAvUTF6V2piYXRFdXFwN2lDMmRqdWtFc3FkdXdpaUthdFVSc1FuVWY4YW5WRUpGR2RUQllXSHJ0UFZRV3NMQUxFT2pGak9vNlIwUTZKUnpjRHhUOW1xakkxR3NVUnFpSU5WQnF0RmJzTnFJbzJzMUJzUWtacmdrbWJHaThnMGs1SDlMY2NvM2tYc0Y1T1pUNk14OUNZOTJaU0t3OHZjaXJTMVprbFZ3b3FDb2FtcHFhS0pBNVJLcmh0TlJ0QnlqZUhsY0x4aXNHY1JJNVBsYWtOS05peDFxald5WGVNcmovSmE4Ukw1WlpVbTUyNU1hR2hvYUdob2FHaG9hR2hxYW1wcWFtcG9hbXBxYW1wcWFtcHFhR3BxYW1wcWFtcHFhbXBxYW1wb2FtcHFhbWhxYW1wZ3dhbURVMU1HcGd3WU1HREJnd1lNR0RCZ3dZTUdEQmd3WU1HREJnd1lNR0RCZ3dZTUdEQmd3WU1HREJnd1kvR0RIK3JIOE1tVk5sTzF4M09PNVRzVTNVU1Z5RGJMa0ZubGVNU1lhNll5OFhjMGNwMHFkQXNPQnpCelI4YmgwRGxQVVZUMEZQUVBTRXE0UFhVOVpUMUJsWkVHd2lSbXVxUzNXeGp1U2xGdlRLZTlLU1NPbE1HREJnUnVSSzczRVRJNEV1Y3ZxVDNMRW81a3J6MVhDMVZQVlU5TlZFNDV5bnkxUGxuelJuSDRIUnh4anA0MmkzRDNYaThoTXFNdHZqZE55RTFneitWUTFOVFUxTlRVMU5UVTFOVFUxTkRRME5EUTBOVFUxTlRVMU5UVXdZTUdEQmd3WU1HRFUxTUdwcWFtaHFhbURCZ3dhbXBxYW1wcWFtcGd3WU1HREJnd1lNR0RCZ3dZTUdQeGo4WU1HREJqK0dQeGd3WU1HUDQ0TUdEQmorR1B6Z3dZTUdEQmd3WS9sZ3dZTlRVMU5SR0lKQ3dTSnFEZjBORWFJdzZrT3BEckZqVlIxWWRCZ1N0c2VrTFJQVFZEMVZQVlVTa3FucUloNjZIUTBTdTA5WVZ1cHZnWXFxWWlITnFIUlJjT28wMUgwb0VQVWdKSXE3UlVRVDlEYmlzUmJzaW5zS09WcmhXTUZqUlQxMnFlcTA5Um9sWkVHVkZjZk5jU1ZHeGs3dFNSN2xKTXFPYWFtREg0d05hYUlhb2FIV2RaMW1wcWFtcHFhbURVMU5UVTFOVFUxTlRVd1lNR0RCZ3dZTlRVMU5UVTFNR0RIODhqbkl3bThncHhTdGtZc2VEVXdZTUdEQmd3WU1HREJnd1lNR0RCZ3dZTUdEQmd3WU1makJqK0dEQmd3WU1HREJqODRNR0RCZ3gvSEJnd1lNR1A5MkRCcUpHZFIxRFltaVJRaVF3RFd3b0k2TTdHSFlkeW9lMWc5MXA3ekJMakZFc3hxTFBHTGJhaDdtUnM3Vk8rSTdvbE95TkIxbHFEcnpVUGV5T21jNHlPa3dTVG9MTTVUc1UyWDhJeFZPcFRyVTZuSHJQVVNrNGRUMUZaZzFOVEJnd1kvR1RKRGJkR2RyWnlTZ2tnL2lXa3ZIc2FTMW1vU1JOUWNpZm45R3lDdk5qSnNJNDJGZWFtcHFhbXBxYW1wcVlNR0RCcVlNR0RCZ3dZTUdwcWFtcHFhbXBxYW1wcVc3dGVrbHJ5NXJEamZJYTlwcTJxcU5kNVRXYkszeUNrNUpQSWFqRXVlUjI1U2VTZVYwYmQzOFh5bThhcE5SU3JhaHROc2M3U3FTTzhsb3RIK1d3dGZWc3N0eDZtREg1d1lNR0RCcWFtREJnd1lNR0RCZ3dZTUdEQmo4WU1HREJnd1lNR0RCZ3gvREg0d1lNR0RIK3JIK3ZKazJNbVRZM1U3Rk8xeDJ1TjFPeFR0VTdGTzFVUFpjZXc0NzNDVzNJTGFlcDNQVTNjbzFGVVNOQklvVHJxR0tZMzB6V3FvdGF1NDlDQlJlUHJJTFVwb05xMURTcEduWlRGWlRjZFZSQjA4Y1E2MUk0N0ZVMlV6K01HRU5Xa2xxQ01Ya2E1OUdBanN4U3Eybzk0bEU5V05wL3dNSnVXZ2dTeHp6bkVuSlNQSFdYS09reUs0eVpNbWY0Wk56YzIvT0RCZ3dhbURCZ3dZTUdEQmd3WU1HREJnMU5UVTFOTWl4cVkvR1MxZGdvUjN2TWttV1dWWEVqOHVaTkgxc1hMbTJNS3N1RWJJajAwMFNld3hUZ0c4WXd0Y1g3cVJQc1UydmdwMzB0VHlRa3RLU0JzODNjY055dldXSHVwdHIrVEpLbGJuNmxsNmZzMU5UVTFNR0RINXdZTUdEQmd3WU1HREJnMU5UVXdZTUdESDV3WU1HREJnd1kvR0RCZ3dZTUdESDV3WS84bWZ4a3ovUEg4blM2bmVkeDNIY2JteGt5cGxmNVlOVFVTdkk0OUo0NktPTW12MUlTWG5WSmVUbmtGbmNwMktibXcwam1qWU41WFFUbWx4WXZPa1YwOGlpdlZSVlg4NE1HRFUwTlRVMU5UVTFOVEFya2Fld3c3MkhzUm50UkllOUNnbDJGUkxFVGpacW42TW9mcjhaUkRacCt2NDVNbVRZUmNuS2VVVXVMUzM1TGM1SjhISXpWeVB5NjlHUitZeHFYZkwxNjdFa2xxVlAvQUx4L3c3SnZXM1E2WkpGYkF5TVdPTnovQU84YkgwWjUxOUd0V0U1T0dDU2o1Wi9XRHloY2ZTb1hFOVZrckU0eDlaMXZpb2JxWE9IbnFPNDdrTkV0Y0pGWld4Um5PRDViQ04xY1kvaGo4NE1HREJnd1lNR1A0WU1HREJnMU5UVXdhcVQyWXFyVjhwNDVIdzNhODdKK2NvMWlyeU5lNG40d1lOVEJxWU1meXdZTUdEQmd3WS9oZ3dZTUdESDg4R0RCZ3dZTUdEQmd4L0ZVUWNyVU5tbjZNSitjR1B5MWpuSHJQSG8yTTl1dmxrMVpUMmF6Qkw0dklxaFk1TlNhekpJT1lyajExVVdzcDBLZEoxbW9tREtINkd3N0hwanFhaTAzQ1VIcWZPZWg2U25wcWVvZXFMV09nNlRwT2xUb1U5ZFRvVTZEcEhWbXFMUmFPb29lb2VzcUhTcDFLSkdvalhDSzlCSE9FblU3anV5SnE0U0pxblFoNjZDUUtkYnpSNXE0dDJvNkxIK2FjYTA1Znl5MXlDNS9iRlJSRy8xaGFzanBKNHFiZmVra1Z2SU9QYmdJTTNVN0tsRVplbG5YR1JzaVJucnJLNWpOVXRXbTFteUt0cDZRNm1tcThNcVN4eU5TRmxia2VQc1NST25hamJyVlhhRld5OExRdGljWE5TUkh4RnJoMGVWN09wSzIweHIrZnVRTEw1RHlhTTRYeU81TGJsdTE0eGlwSzNVMU5UQmd4K01HREJnd1kvZzVXc0c0ZW1DenkxU3FQOGpyb2wvbmJsa1JKR3FzVHBsNk1KNnhKSEhqakhwMm9zOVJJZVNhOUk1V1NmNmNHREJnd1lNR0RCcWFtcHFhS2RUalhCK2h2V29xUUliUkNkU2lSd0tldTFSdEJ6ajVrbytrOWgwdVBYZWVzODlaNTZzb3RlUkRyY2FLYW5XNFZxb1lOVHJWUll4eU1RZTZCQjFtSnA3b2w1TWU2OVJMa3c2N09MYW1HMzVXbjBKQm5JUExOMlI2UGplOWVwVU90UkdPRzd0TzJSRHVVUjZLTjBVUmpCWUdxTFVROUpwNkxUMEdpMEVQUVBRUFJVU3E1QklYSUkxVUVOUldvT1lMR0xDcDBIU2Rab2FvYUhRcWpxd3NBc0lrQ0hVMDZXbnJ0UFdhZW9oNlo2aDZ6a09wNTF2T3Q1MHZVOWQ1Njd6b2tQWGtPaVFTSjRrYnlSblJIeXZtR2kyYlUxdC83UVpoNjErR1JXenRwTmZZb3ZoaXFQZXF6VTVkNHVQbWVrZkV6dUc4VkJHTEpDeEdNM1ZqQkdZRmFpRDdzVVI5SExiVFA3ZTNHeEd5T2UrYTdGclQ1cVRqMHQ4dll2T1MwUWNoZnFGYnpldzFhWGtUYkRYOGpBOGo1cDFjVG02TmxHdXJabmZCTU5TV3NQZlh1dGw4Y1lwUHhFOUdmTVhLMU9PbmR4b25LUEllVGduRm1qUXpuK09EQmcxTlJHNUx2SjFPT2J5Zm55RTF1MXlzdkh5V2VPU1hsNTdJKzNIRVFTTE0zUmpTVGtJMkZhZDlwWm1mcU91bVpOWXlSa2tpOGR6cnFqVVdoYlI4OWVCWStmcnNWdkwwbm8vbDZVVFhlWTAreVh5V3RYajQ3bnFYSkNOeWFvYUlhSWF0RlF3YW1vMkJYSHFxZXVNck5PbUFXdkdvbFZwTFJSVVdnN1B6WGo2RXFDMVpFT2g0bGQ2amFqeGxOeERIMWlvajBrcDdIejNuelpST01tUG5UTkVpc3RQV3NTSHpKQmVNZUx4K28rTnJCN25IOTFGZzJHeHEwMU9wRkZyTlU5Sm9sUnFIcnRQWGFKQzFwcUxFMVRwYWRERDFtRGFVYmhlUGpROUZGUGxvTFJpYUxCQ2dzYkRyYWFORVJwbU1WelRjMk5qc1EzTmpkRGREWkQ5R0VNSWZvL1g1VkJXaXNOVEIra0VlaHVpaTVGZU93WU1meXdhbWgxNU5FeXNLb2FHaG9hbWpqa09lcGNjMmZ6SGtabmNwemR5NlJTdGFTUHI0Z3J5V1hmTmtxSjEyTHFzcDE2S0pNdDRaSFNwS25JT1ZVbHN2WHJjb2xWWG1rYkhkRDJOczh6WHFxL25wbm4wV3VYNnpHby9rTE1xUGJLTVpITTE3VmljMXVGYXRaeEpHeUpudnEwcndXT1JkZG9Ob3NvK1NyQWxibEs5cE1pcGtXRkZITWFnMk5xci9BUG5OUi9JWHE0M3lkVVNYazY4aXU1Q1JZcTNQUGpXVGxiVEhTM1pyUlI4Z3NVSE84empqalo1MVdLWGxYR1hTeDVaeGRWMWZ5RGpyTGZxVXgzT1VHRW5sUEhzTEhta2JFNUh5cmtMaFZnanNQbWhpUWJCRWc3WmlzWkxLa2ZIc1lza2pXSXNNMWxZZU5hd1RFU0wreFg2RHNxSXh3MUducXE4OVZDYnJnVHRqc3VxOENyams1SGNjaWNqTklRV0dkc1BJeVZ5RG1wMk5xOG5CYVRKa3ovUEtvYnVPMXgydkVua1FTMUtoNzBwNzBoNzdqMzBQZllMZmFlOGU4NFRrM29mVWtVOTl5aVhJajJZVk42eWkrb082UnF4QytxbzV0VTFyR0s1aUVWclRVMU1HREJqL0FFNE5FT29XTTBORFEwT3M2enJORFEwT3RUclVTQlRwTkJJOWhZSElkYWp0V2pyTVRUMjJFYjQ1QjJqVDJva1BmaFFkZVlvbGxpbVkzQzZvT2thT2xPNDloeDNDeklKYmpVNzQxTzFnajBVeVpNbXdpbkkrVFVPTVRrUE1yOTg3MVYvSCtUMzZpU2VhM2xHZVpjb2pxdmx6WHcyZkplU21PUXZ5dkk5cDFzV0dWV1NLcjMxZVBtdEs2S25RU0RrTFVxcTdKSmUwUnNNdGwwUEdxUjFZbW11Qjl1dkNUZVJReGxubUxWb2hlMUhROGphcGxia2FITkZudzZ0bDNpcXdrMExxdzZaNS93QXNoVzR5eXF2NEcxT3NQak9DTGlxOVJ0Nk90WWY4V1JXd1IyYURwcG1XbVdJdW1XclNyVFFKeXRtak5VOG1oZVEyWXJLZGVSM0Z3dVZ0VjhhT2U2SVY5YVViRkNnNldOcGI0V3ZPc0ZCckdTY1QrNWFsdG85SkdyKzFHOGJKT2pQSExEaUx4dUZoOHlCaDZqV2sxbXZBUDVGMG8ySEQ0SUpwbVJWbzJFc1QzTjlXQ0o3VVZ6WklzSkIwcXJ2NnBLdDZhU0dMcGFySm5pTVJnc2F2T3FHTWw1aWxYR2M5U2tMM05TT0tkRmI4a3ZHU2NlaWVSMldET2NwMzIzdUhqZ2FuOWpqdVJoOWV2eWphZGhlUjQ2UnJQSkdWQlBNdVBQOEFNdUx6WDhpNDYwclhJOVA5bURWUlcvbkJnd3BxNC84QWtkWWlhZTdBZTdBTGZyaThuRWZUakc4aENwN3RjWGtJVVBvc0czNDFHelJ2T3JLS3pBcXNRZE5FZ2s4U2l6UW9kMFlzelJiT0JMTEZHLzNFZ2tjTW9UT0ZvS3c2WWtGOVZnKzNVYUx5TmRENnNCOUtvNFcvVUczcXFpOGhXYVA1Wm83a25xZTlJZlFsRXZ2VVRrR05SL0pOVVhrVDZMaGVUa0gzSlhpeU9VMk94VUZzdlVWeXFaTW14c2JteHNiR1RQOEFEWTJNL2padzE4amw1RG1vdU5Sdm1VS3Q1SG5ydDkzL0FPNFpKSWozWVhEVnFrVnVNOTFZMFp5elhsem1FUnRYU2FTemRSakdVN05weWNmSFZKYkw1Q0d2KzQ2VTd4T0xVajQxckI3NG9FZnpGVmhCWWx1bnhsVldjTlhzSlA0YkRtZnhlM0Nub1RSbGVDQ0NPMDlKWDhMeXpudGRqS3hPWUxGL1d2VzQ2eVA0Vm1majJVSFVKMkZ5cDNNYjQ5VFJZSzBkWk5qK2luTVF0bWZGeFZock5FaGU5RmxmQnhLb2pPWHQwSFZQSllKU09ka3JWY1BoamVkS0lZM0d3ckVyWTJ1T2xwMVlNTy9HeWlxSzlCMHpHbDJUMmlIaXBsRTQ2WFd0eC9yalkxVVFtaWhJdXBYZGY2V3JHcTZZTlRCZ21leUZMSE9Rc0p1V3RTbjk3RHBLOFVEUDI1Y096VDJnYlNuM2o1ZXBES2tVTFpGZkUyQnFPTTVHdFZURWJEMm9tajd3NlYwaHcvRWU5SmZTMXc4a1hNMjVJYUhtazBNc1hOVlptL1VpUHBSbjBtSDBVRjVCVDZMaGVRa0U1QjZIMDFFNVpVSGN2SXBKWmtrWDluN04zb0xOS2RraUhzemp0bkhXZFpvWS9sK3hNaVNQUVdSNm43TXVRMmNwaFJ1VUcySkVQYmxGbmxjWlVTV1JwM3luWklMbFRVMU5UVlRyVTZ6ck5EVTFNR0RCZ3dZTlRVMU5UVTFNR3BxYW1wcWFIV2RSMUhTZEIwSFFkSjBGWG5MZFlsOG1zS3NmbEZrL3lWcldwNUxQTXQveURrVVJ6bldINFZET3hXUlkxa2ZibVJPTGx5K2l4Z2x5T05KN0xwRGp1TWZjZEx3RlJwVW8wSUJOVUpvYmN3bmp6cEZnNFN0R05xeHhOdGMxUXBrdmtrc3BOZnQyVlpBc2tsZmlZWWFyWXQ3VlgzYURtTzdtOGx6aVVodnUzRjdwYTVpdmFaTHhNTTZyUXNWWllic2NrY3NxMEJaMnEyR3pETy83Rlo3Zm13dWRTc3kxMGJicnpwY2g0dEcycmZDUnJISldzcTZCV0RXbldUVVlyTFU4ZWpqZFo0cGpVajRyMlpMdFI5TjlheFlxclQ4bFk0aWxaTzFHbWhxZjFUOFpOME5rL0NzMlBWWUxHeU1TVkhDTlZUclU2ekIveUhYTW9sUk02NE1HQzV5MVdtUytVeTdROG02ekRhU05aR1ZkMGV0VmkrMHhwSFRmT080enFaeC9GdHR2dlFwVUZjOUdzWisvajA3a1UvSFRWNUphVThTTmllOGdvdWMyV3U3dGg0eG8ybldpZFptU0Z2RFBWc012a1ZXWjdxMGFPeERmYk5CWTR4OUhsN09yUEs5WktsK0czRzE3SEhYazZqckZqT3RUclU2MU9zNmpxT282enJPczZ6ck9zNmpxT3M2enJPczZ6UTBORFEwTkRRME5EUTBORFEwTkRRME5UUTZ6ck5EVXdhbXBvYUdnckRRME5EUTFOVFUxTlRRNnpxT282anJORFJUUlRINHliR3hzb2oxUTlXUkI4U3hwWnVDNWNzZHZwWXhIV1pJYWlSdGxZakIxOXJCZVNtVVN4UEtZL2NWZDhveng2U1ZhL0QxS3lyRTl5TjQrSVl4akIwalkwbTV1bENMNUd5UlpMbk15Skh3OTY4OTNqbEtNZFc1R29Pcnd6dWttVHRkeUUyaVRwdTdrUFdiVDhrcXZqdjhBTU1sbTlwWjJTLzFTQzJyYTdabDNqNWV6QXFjN0lvdlBSSXl0NUJ4OWRPUThpb3lML2xOakgrVDNTVG03c2g3azQ1N3BEL29UTEY0YmtKTE1FbG1XRllyMEVpSk5HYkl2NDYycVdPTHJXai9IS3JWbThicXlvbmpFbGQxUnR1TnVTZTVOQ1A1T0dSSWIwYkJzekowV3N4VmJFalRYODdZT3h4czVSR3FwalV0YzNTcEpQNW1OOG41R1UveVhrR3JYOGptZWtua2pHSmQ1dWUyZm9ZOXpDU1paRlNCeXBTNW4wblBvVmVaVDRkdW81SVpNVEk5b21XditrK1JqWjFnV3hKM3JzakZpdXZuWjc2Uk5sZW02VElzVmJrT3FSWjN6bzZ5MnVXZVM3VjRIbEkxanQxK0pzeVQ4R3NRcit0WTVZN0VVOVBvVldGS0dONVlpcG9SekxBczNrRTdWajhvNUJpemVXWFpHcHp2SWp1VnV1ZFJ2M1lvcTNPd1RLeFdTSnFhbXBxYW1wcWFtcHFhbXBxYW1wcWFtcHFhbWhvYUhXZFoxbldkWjFuV2RaMG5RcDBuU0xFZFFzWXNab1lNR0RCZ3dhbWluV3AwcUxFcUhXZFoxSFVkS25Rb2xkVDFGUFNQUmFlbWg2Z3RNOVE5UkJ0Umgwd3ROWXpXTXU4cWc5N25xYWlKKzRGWmhiVU1MWldXYmJvT0NzeWtmRlZhdzdqckZrcThUWHJDWVF4a3hxUHRSTUxYT3NycFk4aXR6RWs4a3FrVThrUTI1TzhXeEtndHFVOW1VOTJjN1ZVN0hLaXlxaDJIWWRnMTM3MWxSRzhwSkd4YjBvKzlLUG5rZUtna2FxWS9IL1F4bjlZLzdQbGVyMWpzckNpeUxzajFhN2orWHR0VjltS2NYMklFOWlPVVgyNGxoNXFkaXc4eHVSM0dTRzJUSStYUlBhc3VFbnNpeU9jam9JM0VhOUF0eEdKSnl6Y3Q1Q0ZTcDB5SXJrUTdFVXRjalhwTnQrWUtUYzdmbkpMTTBoV3JWdXFYL0FPNFhOR1hJSWxmN2R0a2tMNDNWNmNreDh0N1VsZ2JHSXN6a2tyYktzVFkwNHZoSmJycWpYVW1kRU01SlNScVBxMG5LdkNNZWt2RXl4bGlqZ1dtcUMwWEtKbHIzVnYxTzFGYlhxek5jc1YyVnE4Sk05VW9RVnhPaEh3Mm9yRGJYQU9oYXV3NzlyM1NOTzRZOXNvdE5VWkpEQ2c1UDNWcnd5TEpMREFJa3NwSlFsWTNqNUcybzdOU3hWV2xZN1IzSVhxRDRmSVpFYkg1RFRjUTJhODUxSFVwb2RaMW5XZFoxbldkWjFIU2RJa0tEWTJvSXlNNjREV3NZckNSMDFPaWtkVk1iNmJUMmE2SHRRRFo2cW5kVEV2UXNGNUpwOUdNWGtJaGI4S2kyNjU3VmMraXhCOXhyejJJejIyQzJZbEZtZ0Ztak81cDdhb0xka0ZzU0tkcnpkeGxUS21WTXFmdi9BRllNR0RCZ2pxeXlET1BRaXF4NGI0L0pPNnR4RmVzT2hSUklHTU00UDJMc1QzSzhBN3lLb2l3WGJkb1pSdnlGeTF4dEFzK1F6U0pKSTZSUkZ3cnJTdWFqanRVemthbzJOQjlsaU4ySE9WVEdTSGk3VXllcEJDNnB3OWQ3WmJkV3FTV2E3aDk1UjB6bm1SUDJOalZIUC91MTBDSU40NTZtMU9zTEo3RDN6c3c1amRYdWpGZTVmeFR2UnNHTEZLeGtFOEoyTmtQVVRLT2NMeDhEeEliY1IyeXhNcTMzVHVtbmtxdFRtcXpsYnlFTHoya0hYTUMzSlQyckNtYkRpTHZhZGtqVXM4NVVyRnZ5SzFaSGYzVkkxY2V1cUVkWlhra0ViRHJ5ZFNsYmk1WHIvV0JGdlZveE9SdHpDc2tjTllvc0JKWFdKSkhicncvTE1vUFp5MVMyeWVIalVkWG1jd2RkWXFOaHBTSyt5K3ExZWVwdUhXK0pldnUwVlM3VWRPdGUzTFNsaDBzUldKTGRhU0I2VHgzcWNrN2EzanlJcWNSVmFyNlVMbTFZSlluM1BINTUxczhGY2lGaGZHNXIxWVNSSklRYVRSclY2M2VzMVhMSXl1MXJuSzZYa1o5WGJTRldDU1dhQ2V4VGprNHV2eUtmMmdTeFFmWFJ0cHh0RTg5NThhMStlbnJ5MS9LWmxqajh2cUtSK1I4YklKeTlGVDYxRWw1L2pva2s4eHJOZFg4bm96a01zYzZHRFV3WU1HREg1d2FpTkVZb2thaVJLSkNMV0ZnVVdGUllWRmpVMFUxTlRVME5SV21wcVlNR0RCcWFtREJneC9EQmcxTUdwcWFtREJnd2VreFJ0ZHNac1pKTHNNUko1RFFpSlBLNEVIK1UybmtuTWNuTWVweUZzcStQMUduMGVLNHB0ankrMDhzOGhjdUNmMU52MmlJbzZOU0xqN05nZnhVa1EyckVndnJzUkd1a1ZLNnhvdjhBWjFmaTdOa2g4YVBrVXE3Zlk5VmJNMzBFaTRtR3FYclZkd3R1Q05IU0s5VEF6Um9zeW9rVmhZbGZNK1ZXVFNPSkt0Z1JpdVZXSTAvWnIrTUdEanJucU8rclNuYTJLcEltdGxnNTJGYktPU3dvdGgwQ3c4N0l3bHVVcm9qRlJIeFNzZEZMV2NUMTVHdHAyWjN2L3dDalpnK2RyU3hjdEtTd3p6Q1VYQ1VSSzhNWTlYUEdRSzFXMGJOZ1dqVnFwTEoyRVc4SXFUV0JLVEdESVVITXdWNGNwUEVxSHNQamE2dlp1TDZWU0FzU1F1Ry8xRzJrdy9wSTdUaHltRDNYeGpyRVRoN2tWV1RQakc4ck8wcStTcEVSOC9Uc0l4N005bVRmQkxjbmUrSm1qYXZOTnJYWkh3OGpYWXlTaks3dmtiUFI0K1oxbmo1YW94ZFgySTNLUXd5dVArQ0p6cFk5NVljVmFWUDJWZmVaV0U1Q3R0RFpwTExUUjA4YThmR3dsNGlLd1Q4SFpqV1ZxdFdIaW0yU1NoWTQrU3JaZ3VwUFQ2Q1dxckUxYmxNQ29SU3BHOUk4SlM1dSt3aDhrVnBYNWlsWUdLeVE2bE9wVHFVNmxPbzZoSVVHd0lKVlFTc2dsVkJ0VElsSkQxR2kwMnFQcFlId1lIUWl3cUxFTEdLd1Znc2FpeHFMR29zYW5XcDFxZGFpc3dkWm9hR3BvYW1wajhZTXROVEJneCtjR0RCTHp0V01rOGtpSmZJclR5VzVQWlBWY29rU3FySzM3cmNYTk1LbExqRzNlYWxzQy90Y1lOMUlrN1h2NGxYUnc4RGFjSjQrMWlkSEdWMVp5c0VaYzY3aDZNcUNWbHhYcnh2V3Y0NVZVOVdsVFdXNmoxaWhsekxIWWtqZGE0Nml0anllWnlXTEUxbDJob2FrVmJaRi9zNVlYc1BTa2NSY0paa1NIZ0d1UFQrZEhjbmhtbGpxMkxhcHdWaG82clVoSFNWR2pwRmtWdmpjcjY4SEZPbmtTaWxhckluOTlWY1F4eXVSMXUvQWZXbEc4bWd6bUVGbnFUbnJ3S2V2SzBaTkpDSmZSNXRIaFVpY0pKTEdPdE9WZTBTMHJSbGxGR3lWbkVkV3ZNTTRSc2d2RXh4a1BGT2tTZmo5RDRVYjBUaTYrM3cxWWpPRzdCdkRMR1NjUE5LVi9IV3hMOHRYRGVGWUp3Y1daT0Noa1QvRjZtVThhcG9UK0xWbnBkOFlrZ0pLcm9Wd1Zwa1JMS1Z4WEg5VG9lb3JIdE1paVJQZWRjc1JCek51QWk4amFwRnlFTXhkc1RPTTRHV1h4QzhoSTRTKzlDUzgrVkV0UFlmUWtRaTVXRWZQQmVaMCtzUnZqYTZhZDl3c1dFanJKTWpHdmRsV2Y4cEhZbTQrU0R6T2RqUDhuNCt3UThsRklPbmRJajZsZHpwR2RyWGNkaEgxTUpIMjF6dWE0VmtEaDBUMEZhVjdDd2trckpTdnlFc0pIY3FUblRHZXpackVuUGNnbzNsTGVZZkllUWlHZVYzMEl2TGJxRHZMTDdpSHk2MmczeTJaVC9LcEhKRjVOT2l4K1V4RWZrTlI0ems2enlUbHFzUS95U28wZjVGVmVyK2NvNGs4aHFvTjhocU9IK1JVRUkrWHB6aitSck1FNWFtcDlPb2lUK1ZjWlhXSHlpallIY3lpa3ZMV1NXL2FlUDJjckxVMEtTMnA1Q1BrTFVBenlHZG9ua09SZWVIYys0KzNLNGs1T3k0bGtrbVZLVXFqVTVDQWo1Zms0aVB5R1lUbjRGUHUxajcxUVh5S29oL2tsY204aW1VYlZjTFVjTTQrWjVEd3BKVmxSck9NbFZXT2dvdHVjclptRlhLcUkxVkkyVlVSS2FUTFhveHdrMTVzU1B2UFVweUpNNks3Unp5UE9lcVVaYnRoMTNsYThESzZKZG1XMUJVYk5hZFBOSzZCWXVDcHVXVzl5VmJqWWVSNW1ma241d1pOdjJJNXVzY0xwVnBlT1N5aWNWV3FNeng3SkkzSU9sUmpuZVJjZEEyMXpTM0JrSEl5TzlHK3BkaDQrQnFJVlkyVFBtcm9od2NFMFRYeXdzZHlNczkxZlhoaUprV1JJT2lxU2NvbXNqVmtmaGlDU01hTEtxbTRqMU8yVENxZGprUFprUVczS0xOSTRTeEswZzVLV05KYjBzb2t5dGMva0pudGo1SzFDa3NycGxpNUN6WGJKSXNxOXIwUkYxVmJFcjByMjU2cjA4MTVEcXErWTM0WktQbEZHNjFscU41MkMyY0MyRkVtRW5PMFZ5S1dPUHIyVW04VmdlcStISW9uaGpTSHd5c2hINHZRWUw0MVJVbThVaWNUK0dQSGVIM0duK0xjZ2lTK01jZ1A0Rzh3K1RiYUpTc1JMQnkzSVFKOUdHY2RYcVNqK1BFb3FxdDhlc3lvL3dBZHVzSDhkTkdldXFIclpJYXRyRWxleWRibzFldjdWeHVObDFIeWJtVEkySnp5S2U1V0llZW1RYnk4RW9saU53NmFRZFljZXdndGhGTzBiYVVXZHFuYWRwMmlUS050VElkMHJ4clpGR3hQR3hEZXRCSHdvZDdFRXNpV1hLZGlqSkJiT28yZllkYXd2c3VGdElvNlp5RWx0NkRycmgxdkk2YU5UTVNpc2pVNmtOTURtSWYvQUNNdTJZaE9mc29pODdiMlo1QkVxTHpWTWJ6VlI3bG1qMGJMTEtMRllVNkpEcFVXREo2d2tLc095WkIwODRzc2gydUdUcTBXNDl4MlBVUjhvNXp4WEg3RmwxSkx6bWtuSlRLUHVTdUhTdWNmdjhNbFJoSllra05zRGIwNk5XVnoxYzc5SW1pTWZBZzY0cUhhL0s5c2hxalJya1FjOVZQMlYyeE5TWGtwaVhWeCsvemdocVBrSTY4YlZyeXZnWk55a2lFdkkwOC9hZWl0dFY3Q3RxOGFrY25JdmhmOWUyb3M5aVVkS3pLT2FwQlNkS1EwMkNQaXFOZTZhU1dTWHNSVjQxbzJlazFXTmcwdDhsR1BsYy84WU1mbVBWRVZjcmt6K0VZTHIvczFYOG9kRGxSRldOVzhqYllqN2t6bHErU1hxYlpQSUx6NUtmbWMwWkY1VlRrU0RrbzdLZDUzbnNIc0NXUkxaN2g3aDdSN0ozbmFiSVlZcDB4S0xTcnVQbjFSS2RVOU9vb3ZHMGxFNHVvMGJWUm90TnJ5VGdxc283eFNvbzN4bUdNK1E1by9qSEV2RnRKK0loSitGUlIzQVNLZjQ5TVJlT1NaZzRWdXNQQ3NpWDU3Rkg4SFVlZjQ1U1VkNHhUVWQ0c3dmNDVaYWY0L2FVZjQ3WVFYaExpRGVEdU9HZU4yVlA4QUc1VUpPRnNSRG9ueEhhcUVUYk1vNkcxR2Rpbllna3FDVHVFbFZScnhzaUllMEpMcWUzc2R4RktUeURiQTZYY2RJNWg3T1J5dGNPUlVIS0s0M093N2xPOVR2RmxhS3JGRkZSUmNpbXFDS3JSTEV5RVBMVzRDUHlSY1I4N1JrV1RsT0pRaDVMaVpuVnEzQ1dpUHhuajNwOFBpNERIRHdDOHZ4VVE3eUtxMGY1Sk81MGZNd2FPNVBpbkh1TkZ1SVB2SVNYV2o3cUMyOGl6dVAyNDJ3YkwrTW0vNFQ5R3pSWG01Mk9ObFV5WkdzeUsvSDhNRFc3SzJsTW9rTU1LeVgyWWJjbTFrbWZKL0RZMk1pS2RpL2lKTlNPVlVhbG5BK2RTU3grM3ZSWE1zZFpMWWZMK01tVFA0UnlvZjkvbi9BTE1ZL2lqVmNPYXJmNEl4WEN3dVE2aFV3SWlxZnREUDRicUlrUjF0T3RoMTVWM0hTYUttSGRlVFJVL0Vjam9YTjhrdXRqZzhqc3h1ZzhpcnlqTDdKRDJ6M0VSRTVlRlhKZGFOc2lXUkxJbG9TMGUyZTRlNGUyZXlKWUVzQ1dSTEI3QWxrOWs5ZzdqdE44am1zY09yTVVXb2c2dXFIVThTT1VXT1VleVJDVjhyUjEyUm92SnVQcU9GNVJ3dkp2RjVKNDdsSG9MeTA1SHpWaGdua2NpRHZKSlIva0ZodzdtYkNuMHBYRU4ydVIydU1jTXE4Yk9mQmljaThJMUIvRVNzUjhNN0JsZWQ0cnVnN2Roc3FJZHBES1daVHZ3ZXlMWXlPZWR4M0N1eUxoUnlLZ29xaXFiR3hzYkd4c2JtNHFwL0hZMkZka2pzU1FpOGpaVStuT0p5MDZLbk9URHVWZTg5OXlpM0ZVU3dwN0E2Y1Y2citFWTVEdHlLdWY0NU52OEFSLzBLcXFZL0dETFVFbmphZlNtUkh6T2tYSm4vQUVKK3ovb3kwMmJsenp2Y2V4SUs1Vk1tVEpuK09mNHArVUZSaUlOZTVnNVhQR3Rod2tzTFI5allTVldpelBjSzdJbUJaRC9zL3IvQ0tSa1o3V0ZrbWJJTXdpdGtnVk5JWEw2enNPWW1WandZTUtuNFJSbHFacU9zT1V6KzBsZGxPWGxTT3R6a2pWaXZwSW51SHZIdm52Q1hSdHNiYUVzaVdUMmoyajJ4TFFsb1MwSmFFdENXVDJUMkQyQmJBdGdXM2dXK0x5S0MzMktlekM0ZTJ1OGZUaWNTVUZIVUoxWDVyeGFTb2FyRWV5TWRYR1RVOHJGVmtTVGo0Vkg4ZmdkVmUwMGNnaXVhZXpKaU95Nk4zMlpsVDZlQi9Lek9JcnJCZVJoUkhXdGxiWUlweVdYSTU1MkhZZGdyalk3RHN5Ymlya1ZCVS9oakl2OEF1MVUxWCtPaW1EQ2ZoVDkvN2NHRDlHVFkyTnYvQUZZL21qY2pZWThMVHlMV2xRMGNoaFJzYmxFcnZVU284OVJVRmdRWlRRbGN4b3FHTUNybjg0RWpWVENJZjltUDU1Szl0MVlzWHBiUTE3a05zbVVGMWNhNC9oK3Z6SFlmRUp5U2lYMnFKYVJSTEEyd2dsdEVQZlJENlI5TVRreEw0bDBiYkV0aVhCTGg3cDd4NzU3NHQ4WGtUNlI5QkZGblJ3NTQrUlJaajJWUVM2OUJ2SnVFNUhJdHBGSFdCMWtra2FPa094UkxUbWlYSGlUeUtudHVhdjAzSU91T2VkeDJuWWJtd2xoVVQyWG0rUnNneVlkT0xJZGgySFlibTVzYm5ZYm1WUDMrRlFUOUR2My9BQVoxajhaL2xrMk5qWkRQL2p3WU1mOEFtd1kvbmd3WUVUOFlOVEg1MVViSmdjbXlWMDFkdUxJYml5S0s5UnJtbmJHZ3N5bSt3OS81d1lRL1JuODRGeC90L1pzcURKbURsZ1VhM2NkQkswVmZ6Ky95amxRU1Z4M09PMDdEWVIrQkoxUTlsd2x4eUh1dVBkY0p5RGtQcEtmUlUrZ3A5RlQ2Q251NUZ0SHRxSmVVYmZVOTQ5bEhHelZGMUZVM08xVHVVV1ZSWG14bjg1L09UWXliR1RKa3liR3dqemNWeHNiR3hzYkdUSmsyTnpjMk5qYi9BR291QmYzK01meXovd0QxTUdQd242SEtOL0RQMFpFRkVYSXFZTWl2VWY4QXBHL3RCZjUvOUgvMS93Q09LNU5FSk9zNlN4dFFWdjhBREgralArckpuK0dUSnNvaS9oVk0vd0RsVC9ibjhaL0dUUDhBRm8vL0FIZi94QUEvRVFBQ0FRTUNCUUVGQndJRUF3a0FBQUFBQVFJREVSSUVFd1VoTVVGUkZCQVZJakpDQmlCU1lYR1JvU09CTUVPeDhHTEI0Ull6UUZPaXN0SHg4di9hQUFnQkF3RUJQd0hLWGt2THlYbDVMc3V5N0xzdkl1eTdMeU9aek9aek9aek9aek9aWmxtV0xHSmlZR0J0bTJiWnRvMjBiYU5zMmphTm8ya2JLTmxHeWpaUnNvMlViRWZCc1I4R3hFMkViRWZCc1JOaGVEWVJzeE5wR3pId2JLTmxHMGphUnRJMmtiU05wRzBqYVJ0bzIwYlp0RzBqYVJ0STJrYmFOcEcwamFObzJqYk5zMnpiTnMyaUZDNzVzV2twK1RUOFAwNythNUhRYWRkS2JZNkxndVZKRTU5bEJIb0sxWHNVK0F5Znp5SWNJMGxIbStiS3MwbGFGSkZpeFlzWWxqRXhNVEV4TVRFeE1URXhNVEV4TVRFeE1URXNXTEZpeFlzWW1CZ1lHSmdZR0ppWW1KaVltSmlZbUppWW1KaVltQmdZR0JnWUdCZ1lHQmdZR0JnWUdCZ1ltSmlZR0JnWWxqRVZOdm9oVUp5NklXaXF2NlNQQk9YT1I3ajhNOXh5L0VlNTVydVI0YmgxWlN0QmNqT295VkZQNW1Yb1V5V3ZvUjdsWGpOTmZLUzRxbVQ0aFVmUm1KaVltSW9HSW9veFJnWUcyekF3TURBd01EQXdNREF3TURBd01EQXdNREF3TUJRTVRFeE1ERXhNVEV4TVRFeE1EQXhNREF3TURBd05zVkpzOU9iREZROGthVkpkaVduaGJraVZCK0QwMHZCNlNmZ1docWVEM2ZVSG9KSG9xbmc5RFU4SG9KSG9XUFNXN20wNzJNSStDRUUvcFBTcC93RDBQaDErNHVHeWZjWENuM2tMaGxOZHhhV0M1Wk1oR25TZDB5V3FmWTM2aGV1eVdwakQ1cGo0bFFqM0svR0UvbEpjVHFQdWU5S3k2U0o2eXBQcXpkTWw3TEVhTTVkRVltQmdZR0JnWUdCZ1lHSmdZR0JnWUdCdG1CZ1lHQmdZR0JnWUdCZ1lHQmlZbUppWW1KaVltSmlZbUpnWUdCZ1lHQmdZR0JnWWUzSXpOd1ZVM2pjdWNqbjVFcGVSNStTTlNYa2pXc0xVSWpOTWxGTWxwYm5vaGFSSVZGTHNMa1NuRWxYSFdYa2xxTGRFU3IxR2JsVjl5bHA5UlVaQ2pzeXZKdG1yblZyY29xeUphU1k5Tkk5RlVaN3ZxdnNUMGJqMU5pSXFOSHZjY2RMSHBHLzl5bldvdy95djVKYXlYMFJTL3NWZFJYbjFrWUdCZ1lHQmdZR0JnWUdCZ1lHQmlZbUppWW1KaVU0N2w4T1pnWW1KaVltSmlZbUppWW1KaVltSmlZbUppWW1KaVltSmlZbUppWW1KaVltSmlZbUppWW1KZ1luTHdPcGJzTnRqaFVOdXQ0TDFvOWlOYXMraU4zVVJGcXEzZzlWV2ZSQ2xYUGo4aXk3c2t5eGlXL0ljYjloT2NPZ3RUVlhSajFkWjl4MXFqN2p1eWxHTi9pS05PaWxjcTBaVFhJMUdqYUpVckdDRkdLTTQrRDRXT01URXhNVEV4TURBd01EQXdNU3hpWURoWlhacU9Jd2p5cDh6VDhTcktkNWN5dHhXVS9raWtlOGF2NUZXcE9mek00TG9uU2h1NWRTZEtuUG5ZMWxLclQ1MCthT0hWRlZxNFZHVnRMdFN0Y3dNVEV4TVRFeE1URXhNVEV4TVRFeE1URXhNREF4TVRFeE1URXNXTEZpeFlzVzluTTVuUDJXT1pkK3hYTVdPRC9FT20zM1p0UDhBRWJjdnhHRDhtUDVsdno5bTNLUk9sajh6SlZZSWRaZGtLcEx3VTFTdDhZNWFhS3VoNitNZmtpVk5aV2wzSlRreXpNR1lNd1paalROdCtCcVM3RjM0SXQrRCt3b21JcWJOcGlwTTJHVnAwYVhLY3JHcTRvdWxGRzlWY3NtK1pTNGhxSWZVYWpWVksvenlJSVViRmtJYlNORnhTdHBuWmREVFU2TldrcXQ3WExRbDhza3l2b29TZDhiTWg4U3dxOHhVSXgvUW5vKzhTcEpVK3FLRFZXT1NNU3hpWW1KaVlsamtoTkU5VlJqMVpQaThFN1JqY3FjVXJOL0JGSWZGcW1QeW8wRlJhcWxrdXBLRW85Vi9nV0xGaXhZY0dLTGZZYXQySEtDNnNqVXB2cEk1SHcrVDRmSmlZbTJiWkdrelpIRkdKdGthRnowakpVTGRpTkZYNkVkUFJmVkV0TkYvTElsd3VMNnNmQ0llVDNRaGNNYTZIb0dSME5MNm9qNGJwMzJQZEduSmNIcEQ0YkJkaDhOWGc5MlJQZFZQeVM0U3V3K0dlMnhiMjRJVk5HMGpVYXZTME9VcGMveU5WeGFjMWpSVmtjMjdzWHN0NUZZWGhFNk02YXZOV0hWUnVQMldGcXErRzNtN0VLdFNtN3hsWTAzRzlYSGxLZDBlKzYwdkJUNDNWajJJL2FGcnJEK1NmR2RQVStlREtIRmROUWJ3NkQ0enBMODB5WEY5TDlOeW54VFRTWE4ySWNRMHMra3oxbEM5czBQVTAxOVJQaUZDUDFGWGpEZkttaXZVclZuOGNpRlNTV0taRk5jMmZHL2xGeVhNdllvMXFsS1Y0TWp4elVZMnNlK0srVnJJcTFkYkdudVZGaXYzWlQ0ekoxRXI4aW04L2xaOFM2aXVjeDM4bUUveEVxRTM5UnNWZnhFUFVRWFVqVzFhOEhxOVIrQWVxMUQrZ3FLdlVYTkVLR3BnL2gvMUhVMVNOelVQci83VEdULy9BQ2Yxay9tLzlKREx1Myt3cXFYWTNUY04xbVprS1JteDFKZVJWSmQyUmNuOVFwR1JjVEd6SXpadUc4dTU2eW11NHRSQjl5V3RwcjZpZXZwdnVQVkhyOFQzc3ZCUGllWFlVMlova1pyd1MxbENEdEptbzR4MnBSS3RhclZkNXlJYXZVeFZsTXA4UTFNUHJLdXJyMVBta1dMK3pFVURTOEMxZW9qbEdOa1ZmczdyWTg0cTVQU1Y2VCtPRFJwdUoxcUNVWnZLUGg4eUhET0ZhK2x1UWhiOU9SVyt5cXY4RS8zUlUrejJwajA1a3VIMTRkWXNsVGE3R0JoWTZFYTBoVll2MldHcjlURldIUy9NOU41WkhUVTEyR294NklXYklROGxrUVNGSG1TaGtPS1NKYWlsRWVwbDlLSlY2alZqZytob1ZhWHhjcCtUVTZ6VzZTcHR5bGt2ek5aT0VwM2pHeFM0eFhna2wySDlvSzc2eFI3OXIrRWFmVjE1VU4ycERrZXNwOHJrWXlselNOdWZnd2tiYk51UnQxUEJoTXdrWXN4Wml6Q1JoVUZUcUNveUZwMnowYy94RWRHL0o2TDh6MGpGcGZKTFNWT3pSNkdzMzgvOEh1OS8rWS80Rm8wdTdQUm85SitaNld4c1NOaVJoSWFxRW8xR09qSXdtaDBaR3d6WWtlbm1lbW1lbGtlamtSMWxkSzJSSGlHb1gxRXRaWGwxa2MvWmNWeFJmY1hzbzZXZFQ1SXQvd0JpbHdMWFRobGhZOTB6UzUzVC9OSER0WHBOSXA3a2J5T0ZhK25UcXlsTnRIRXVONmYwMTZWWG1QaVBkTnQvcVY5ZFFuRlowN25ET0lhWFN5ZU1tayt6WC93VWVLNlZ5ZHFxc1M0M29vY3B5djhBb1ZQdERvRXVVV3l2eHZUeStXbis0dGRRYitPa3JmbGMvd0N6c05SUVZmU1Q1ZUdhamhlcW8vUFRkaDBralo1RUlUaVJiN29ic2JzVEw3bHh5UzZucWFma2pxcVpMVndpUFYxR1ZLemt1WnBlRzA5VlJ2UWw4ZmhsTGc5ZkwrdEZrWVVOUFhUbEM2TmJxb1ZKM3B5c3ZCSFUwNC9ET0dTS2xLZytjQlJTWkZLNDVKSXAxSlMwVUhSa3Y3azZqZzdWSVdYOEZTblUwLzhBVTA4L2hOSngzVXFkcW5OSHYrS2Z4US9rWDJqMGZkTWYyazBTNkptaTQxcDlWTnhqQmtaMHBkQzBTMFMwUzBUNFM4VEpHYU0wYmh1bThiNXZtK2VvUFVJV29RcTZGVU1qSkhJc2piaWJLSHAwZW1SNlpEMDlQeWJFUEo2ZGRtZW5mazJmekZUdDlRMHpGaWd6RVVERmV5NWtYSTE2c09VWk1lcHEvaVl0VFUvRXpPNVl4TWJGNWVTN053VTcreTRrY0tyU2hYUzNNRVRibnp2ZjgwVmRLcXErSlpmd3lYQjZNby9ESC9rejNHcGZMTzM2b3FjRzFVVmVOcGZveVZLdEhxaHlYYzNVamNiRlhTUTlWNEhXays1bVpJdXkzczVuQ1ZwL1VyMUhRV29VWWYwMm12MUpWS1ZWZkVrVmREb1pjNUszNkdwNFRvMi82ZFpmM05Ub0ZTVjRUVC9RaWxJVVZjeE5MWHFhZm5IcDROcGFtbG5SalorQ3JUcTArcWFHeVZ1eUxGMGFIVjdGWDRWZTVScFpmRlNmOWlvdFJUK0tENWVCY1VxTHFMalViMmtlOFlkYmkxa1gzSHJZTHF5T3ZwU2RsSTNuNUhWWTNmdVcvd0NKbUgvRS93QnpibCtOa3FFWDgwbis1TFQwL0wvY2xRbzkyLzNJME5OL3RrZFBwLzhBYlpHaFM4djkyUTA5RmRQOVdLbFQvd0J0a2FjUDl0aWpBMnFmZ1NoNEUwWFJkRnk1ZjIyTVM2TTBabVprWEd5eGIyY3pFMnhSWHN5UmRGeXhpWW1EN0dNa0kwOWFkR2FuQjh5SDJqcS81a0UvNElmYUtpK3VTL1prZU42U1hXVC9BSi82aTRqSHJTckwrNTZtY244VUUvemovd0JDblZoQ1Y3Mi9WR29WT3JLN1NacU5Id3VhK1J4WlY0TFRuLzNOWDl5ZkE5ZEJYeHV2eUo2UFVRK2FML1kycG16THdLak1qcDVzOUxWOEhvNm5nOUhWRnBLbzZOYWwwTjZhSlM3bVRPWXB5WGNWYVhjVmRHNGpoL0dwYVpZeWpkRXVQMEpmNWIvYzFPdDA5VjNqQ3h1UkhOTG9ib3RTNGZLVXVMMW9PL0ptaSsxR2tuQkt1clA5eXRxK0UxK2VScUZRVDVTdWhhbmJsOEhROVhGOWpjaXhUczdvcGF5aTRKOS9CR2VucS9MS3hMVHlTdXBGNUNqVmZTeDZmVlBwYjl5ZWcxNzZMK1I4TTRpMTAvbEZiUjhSajFneFExZDdKUDhBWW9hWGlENjAyVXRMckgvbHM5TnFsMWcvNUZtdXYvTVZTU0k2aVRka1JqWGZZdE5kUnprajFBdFFqMWNDZXZ0MFI3eHFkNmJJOFJnK3FhL3NMV1VmeEQxMUJmV2lYRWFLN2xqbDdPWmIyc3V6SXY3RU4zTGV4SVhJdVhzWm00N0Nmc3VYWmRseXgwTXBQcXhWSnJvemZxUHVRMVZhSHl5SmFpckozY21QVjZpWEp6ZjdsMlhNaFZwUjZFTlpPUFVYRUYzUjY1ZUNPc2ozRlhnKzQ0MHBkVWJHbS9DVTFwSS9RT25wWi9TUGgra1o3cjAzbGo0UlQ3U1BkTnVraGNLbCtJOXpTOGtlQ1J0elpQZ012cGtSNEZXdnpKY0JtVk9EMUlkeDZTYUZwcW5ncDhNcXlId2lyMmtlN05RdTZQUTZsZlNMUjZqOElxRmI4SkRSNmw5ajAxUmZNVTQyK3NoaDNiS2RYVHJzVTlaUyttSkRVWkVad1k0MDVDb3dGQ0E2c1VWYTAxMEttc2wzUlBVdzdvbFZvczNJTDVXVDEybzdUUGUrcWl1ei9zZStxMzFSWCtndU1SK3FML2NwOFIwY3V0MGIya2F1cG9WYWo5TS81SlJiN21LWDFFbkg4UmVQNHZaWXhSWXNXTEdKWXg5bHZaWXhZb2lYM2NibTJ6QXhMZmZUTHU1Y3V6NHZiWXhGY3ZZdjdGS1hrVldSdnM5U3hhc2pxaGFzV3NGcWhhdGkxckZyV1Ixd3RjZXJUNmtwMG1QQTNJcnVTcVI4amsrMGgxYXE3bS9WSFhxK1NHcXFMNnhWNnN2ck02dmtocXB4N0VkZER2RXA2eWtldml1NUhpQ2E2a2VKSWV2L0FLWStKTlBxUGlHUTlkSkQxYWwxSnlUSnRrcHNkVmpxc2RWanFHNE9Sa0tyTmRHYjlUeVBWVmZKNm1mbjdsL3UzTCt5eS94Ym1SZjdtUmYyOHk1Y3VYWmY3dHkvczVsbVlsdlpremNrYnNoVjVDMVRSNndXdFBXaTF3OWF6MXZrZXBpemZQVXlSNnRucVdPcmNWUm9qWFl0VEk5Ukx5ZW9ZcTdGcVplUmFsaTFyeHNUMUxGcW1lcFk5UWVxWjZrZFZNa3hzY2h5TGx5NWN2OEErTGYzTzMzbjkxZjRiKzgvOEJmZFgzRUwySVJMN3k5c3Y4SC94QUE5RVFBQ0FRTUNCQU1HQkFNSUFRVUFBQUFBQVFJREVSSUVFd1VoTVZFUUZFRVZJakpDVW1GeGdaR2hJRERSQmlNelEyS3g0ZkJBRmxPQ3dmSC8yZ0FJQVFJQkFUOEJ4WFl4ajJNWTlqRkZrV2lXUlpGa1dSWkZrV1JaRmtXUlpGa1dSeU9SeU9YaHlMbHpJeU1qSXlNakl5TWpJeU16Y053M0RjTnczV2JqTnhtNHpjWnVNM0diak54bTR6Tm00emNNek16TXpNeU1qSXlNakl5TWpNek16SXlNakl6TXpNeU1qSXlNakpFcWxseVJ2ejdGYlYxMThOaVdycnZyTklqVVVuenFFSXJxNUQxdEdtdXBVNDVCZkFpWEV0VlY2Y2luQnY0NmhjdVg4TGx5NWN1WExseTVjdVhNaTVjdVhMbHk1Y3VYTGx5NWN1WE1qSXlNakl5TWpJeU1qSXlNakl5TWpJeU1qSXlNakl5TWpJeU16TXpNekl6TWpNeU1qSXlNakl5TWpJeUxseDFFdW82MFYxWTlWVFM2ajR2eitFOXJwZFVMalVINkh0ZW1QaUNsMFJXazV2bU9kS1BwY2pxWi93Q1hFdzFkVHFRNFpXbDFLWENHdXBIaDlpT2poNmx5NWN1T1JjdVpNeU1qTkdSa1pHUmtaR1JrWkdSbVptWm1abVJrWkdabVptUmtaR1JrWkdSa1pHUmtaR1JrWkdSbVptWm1abVp1RHEyUE1mWTgzVDdrOWJUaXVwVTRqTi9DeWhySnY0bVJyTHVlWmd1clBPMHZxUGFGSHVlMHFYb0xYUlo1eW4zUE9VKzU1MStpSHJKZlQrNUhWemZ5Q3E4cmlsSitwTnRjOG1QVnlYLzZSNGhQNlAzSHhCSmMwUGl5OUlqNHY5aVhFMWY0U3J4RE5XYUhWYjZIdm1NMlV1RzZxcDZFT0IxbjFacCtFWTlSY1BoMkh3MmpMckVocFlRK0ZHMldaY3VpVmFuSHF6SXlNakl5TXpJeU1qSXlNakl6TXpNek16TXpNek16TXpNek16TXpNakl5TWpJeU1qSXlNakl5TWpJek16TXpNek16TXpNek15L2hLbkdYVWVrcG5sNG84dkVlbis0OU5MdWVVZmNla2wzUEt6N2tvT1BxWFpreFZCVldRcmZjanJJbzgvRWV0dVBVWDlTYzBic3ZROHZYbnpQWjFYdVV1RzA3ZTh5bnBLTU9pUEwwT3VKV3JhYWt1aUx1dEhsRkkwdE9uUkZYaUtzanpNVHpVTzVHdmZvYmpIT29YcnZyS3hWMDlXZithLzBSSFJSK2VUZjVsUFRVWWRJb3lNakl5TWpJek16SXlNekl5TWpJeU1qSXlNaTVWcUtuYkxrWm1Sa1pHUmtaR1JrWkdSa1pHUmtaR1JrWkdSa1pHUmtaR1JrWkdSa1pHUmtaR1JrWE1qSWRWRHJJbHFPeEtySmp1emJadFNOdG1MTVpHTWhSWnRTTnRrS1RaNVQ3aTAxdm1NTGZPYy9ySXpVZXNoN2RYcnpQSzBQcEZwcVM2SVZPQ0wySzlTb28rNHVaUFU2bS92dXhRMWRNbzZtNHAzTWk3TVgzT1ltekl5TWpJeU1qSXpNakl5TWpJeU16SzdzaWpvcHk1ejVGZmg4SlF0RnRGRGhxaDhjbkk4bFRLVk9NZmhSeG5Yd3JWZHFVYlc5U25xS2xOV2IvQUROTFZwelZwLzhBQnJZWVU4cWFLVmZPTnpjTXpJeU1qSXlNek16TXpNeU1qSXlNakl6TXpNeU1qSXlNakl1WExseTVjdjQ4aXlMSXNqa1dpWXhOdUhZc3V3MHpiKzV0ZmMyWDlSdFQrb3dmMUd4L3FObi9BRkNoQ1BVZXBwUjlTblVsVStHSkNoTjlXTFR2MVpzeFhxVm9WYi8zWXFHc2xMbkt4SGhtWCtKTzVTMGRHbjBRa2tYTG95UmRGMEpvVWtXWGN3WGNjRjNNZnVQd2JNakkzRVU0VktuT0NLR2c5YWdxVk5LeVJVMFZDWG9VZFBUby9DaWJISy9neEtUTlp3eWhxRjd5NW1xb0tuVmNFaXBHdFJkbmRHbjRsWHBjbnpROVZDK1ZQa3g2ekxsTGtRMWlYS1JGWkZhOU9XTE16TXpNek16TXpNVExrZE5XbDBpVStGVkdyeWxZaHd5bXZpa0xoY0hMNGpYeGVscTRTRldSa1pHUmtabVprWkdabWJodW84ekR1ZWJwOXp6ZE1XcXB2MVBNUTdtL0Uzb205RTNVYnFOMUc2anpFU05aUG9pOGk4aFNiSlRraDZtcTVXUkhwemtPUCtzcVVaTjlibE5xbjhvK0s0ZktRNDBlMkludFdteGErbjNKYTUra2oyalVSN1dyRWVLVFl0ZEx1TFcvYzg2eno4dXhIWGkxaGN1Wk16WmtabTZ6ZFp2TW8wYTlib2pUNkNNZWRUbWNpeFl2MkcyUHV5RldFL2hkeFFNRWN5NXNVOHM4ZVpLbkNmS1VibXA0TG81OUlXUFllbVhvVDRCUmZTVFIvd0NuMWJsTXA4R3IwdjhBRG1WT0c2aW9sbDFQWldvZk1YQ2EvcTBWT0c2bUQ1SzVQUjZtSFdEUEwxclh3WXFOUjlFUTBOZVh5bExoSEs5UmxDbFFvcjNJa29SY3NtaHRlaGFLNmo1c3NhalQwdFJEQ29yaTRCUlV2amRoOEdvSlh1eWxRMGNxbUVYay93QkNwd2VHMis1VTA4b2VGeTVjdU5OK282Yjdqb1M3ajA4KzVzek5xb2JOUTJhaGFvZStlOE5URmtSWmNzaGNqSmwvQzdKUnY2bUw3bnZmVUl1T0VHS25UTnVCczB6YXBtMVRGcDc5QmFHb3pZYWRpT2xxUDVTR2xxTDBGU1BKNUhzNzdrZEZZMmtiWDNOcDl4YVdySlhSUzRiL0FPNHluU3B3Vm94SmFXaEozY1NlaDA4L2xLZW1vdzZSOExlR1JtYWppMm1veXhrK1pUNDVwVzdTNUVkVFNxTDNKWEsyaHAxbTNGWXZ1dVJMWDhTMGxUQ2NybFArMGYxUi9mOEFxUS90RnBHN1R2Ri9nUTRqcHFud3pSR29tWkRsYzZqcG9kT1M4VnlNbUtvYjNaRHJUWnpaYUtKTmVFaTRuWXZjalJtemFTNnNWT0tPSmFtckNkMXppVWRIcGE5UE5SeFpwYWNsQzBwWEpjTG90dHYxRndPaXZWbnNEVDkyVjlCUVZiYXB6NS9jZkQ2dk8zTWQwN001bUxNSkdFakJpcEx1YlM3bXo5elkrNTVlSGMyS2ZjMnFRNmRJd3BGU01mbExQdWZtTjh1bzZreFZINmpxUHVadnVmbVJqVDdtRklWT2wzSTBhSkRhWG9mM2JGU3BDcDB1eEJVbDBRcWlMd1lxaU54RzRqZGliMFRmaWVaaVBUMDI3MkhwYVhZVkNtdlR4c2NodGVDUlZyd3BmSEt4VTR6cEl6eHl1TGlFWmRPYSt6TlRwNjliSEYyT0lhT2M0S01VbWNQNFBXOHphclQ1QzBGK1RzdnlLV2lxeHZqS3hydERYcnIza3Z5Wlc0WlhVYjdidVM0SlZyV2xqYjhXTGdXcm55bk5GSGdkYUQ1VlR5dGVLOTJvL3dBN0VPTXpwMU5xdkhuOWlscnFOVDRaRzRiaEtVV05kaEpzMjJXL2hTYjZHMUlkR1pHaEppb1JSQ25abW8xODlQVS92Vjd2ZEV1SjBXdjd1U002bFdseWx6S0ZDVVkya3Vac1RmT01yRVoxRjFISnNsY2pHNDZTV3NudlFmNUVJS292Y2xkL3VRY2EvdVZvKzhhamc5Qnd2RGtleFcxN3MvMlBZZXF0eWFJOEUxZHViUnF1SFY5UEc3a2lwVXEwL2lQTk04MGVhUE5ubXg2czgwZWFIcWg2b2VwUE1zOHd6ekRQTkhtenpZdFdMVkMxU0ZxaGFrV3BGcXhheEMxaUZxMGVjUjUxSTlwUlBhY1JjUWd6enNCNjZQcEU4emY1QzZNa09TTGx5L2pid2xTcHo2b1ducDloMElkakd4ZGliTG5JNUcyWUZpdzJhK0VaMC9neUZ5NWZzeUZaMDN5NWZ1aVBFWng2di83UjdVdDFWL3daSGllbnZqTGt5TlNrL1VTN0czYzIwT2lLaUttWXN4Wll2NFdSeExlMlhzOVI2V1VwZThtbitCQ0ZhaytUZjVmMEtXdDFjWFpPL3dDS0tIRXRURldxVVdhZlZ1cHlsR3c3eEd5NVhvMDYzWDlmVTNmTHp3clNSVHFVNXJrMHhYRmYxWTJ6bWF6VGIxUDNwZENwWHg5MnF2elhRVlBUMWVVNHI4ZTVVNEhTZnd0cjl5WDltNjFyeG1WZUZhK0w1UXYrQkxUNnVQV20vd0JHTFQ2cVhKVTMraFY0WnhDRWNuU1pLcE5Pek54bDJYRkt4dWZZM1pyb0xVVmYrcEVkYnFWOENTLytLL29TNGhyZlYvc3Y2RDErcDlYKzBmNkhtcWo2L3dDeS9vT3M1ZFRrS0VSUmlLblQ3Q2pEc0xFV0lzUk5Da2pJVWtLUmtaK0ZtWXN4TGVQUHdzV09oa1g4T1phUmJ3NW1Sa2pKREsxRlRqaklsd21QeVNhSHdxYTZXLzJQWjFWZW4vZjJKYU52NDZac1Jpckovci95U3B5a3VuNkZGMUlLMTJVdFZyWWZNbVUrSnlYK0pBanhIVFM5YkVhOUY5R1p3TnlJNmtSMVltOUEzNEhtSURyMHhWS1V6YWcxekZIME1ZbDBOUmZvWUkyekE0andlT3BsbkdWbWV4S3YxcS80R24wdGFrdWM3bURGRy9VMmgwVlA0aXB3NmxKVzVvMVBBZFRDVjZMdXYwS09uMTlQcXYxS0txdGMxYi9ZZW16WHZkVHlzbDZtMngwN3JtYWpocXFYak9OelUvMmVqSHBIOVA2SHNMdFA5VUwremRXM09hSmNBckwxUXVEU1h4U0Z3N1R3K0tmN2Y4aXA4T2hLem4rek5MVDRKNnpUL1lscCtFdVBQRzM0bkVkUHdyL0ltcmxYUnc5SlgvNytBOUkzMFRIUnFKMnhaczFmcGY2QzBPc3h5MjNiOENubzlUTDBLWEM2aitLUkhoTlJ2NHVSUGhOZGZBMHp5R3IrbjkwUjRicSszN2xQaEZWL0ZJOWtkcWhQaGVvajBzL3pQS2FuNkdSMGVxZnlNaG9OUzN6all0NDNYOENPUlk2Q1pjNkZ6bjROK0tpWURqNDJRMHZDNTFMSkRpbWJVZXhLaFRsMVFxVk5LeVFxTkpkSW82ZUdKZ21PZ21lVis1NWY3bXdiVFFzMTBadVZ1NVBmZnpDZGRlb3RWcUVQVzF1eDdRbjlKN1E3eFBQeDdIdEtQWWZGSDZFZUx4OVVQaTlLeEhpOENIRVl5RlhUSFZqM0pheUVSY1FoNm84OVJGcktMOVI2bWozSFdwOXg2bWwzTitENkZSMytVbGsraVJPaldmcVZORFVmV1JVMENSUFJ0ZWc5Qy9Vam8vZnNMUjJaVDBmcjFLV21wOWlHbFhveU5DZmNqQ29iYmZ4SWhwS1AwbnMrZ3g4T2g2TThnL1Ivc1MwdGRkT1pqV1h5c2FrdmlqK3dxMEY2RzQzMGdSeitrOTc2VEljekpseTVjdVpGekppTCtPU0hNY3ZGWEVacEc2amNNeTVmK0t4WXNXUjd2amNVeTZNVEh3NUZrWUkyMGJJOU9QVEhsa1BUb2VtSHBVUFJvbG9oNk04czBSalVRc2pDVEZUbDJGRmVxRkNCdFV4VTRkaVduaDlKc3dYeW1FT3hMVHhaTFNTOUpFOUxVN25sSk1sbzNmb1MwQXREL2VIa1V5T2p4RnBVTFR0RVl0RVVLSW9DZ1lJVURFeE1UQmRqYmoyTm1IWTJZL3liRnY0ckZpMzhhUmlXTGVPQmo0Y2l5TEZtV09SYitSeUxsekl5TG81RmtZSTIwYkNIcDBlWFI1Yzh1allGU1pnYlNObEcyWW1JNlk2U050RzJiWnNJZEU4cXJrYUpzbzJUYU5rMlJRc0lSWVM4TEZ2L0FEWS93ZXY4dC95VjRMK0JmK1F2NUsvay93RC94QUJBRUFBQkF3RUVCd1lFQkFZQkJBTUJBQUFBQVFJREVSSWhJakVFSXpKUllYR1JFQk16TkVHQklDUlNZakJ5Z3FFRkZFQkNZSkpRUTFOd3NSVmprOEgvMmdBSUFRRUFCajhDOENIb2VCRDBQQWg2SGdROUR3SWVoNEVQUThDSG9lQkQwUEFoNkhnUTlEd1llaDRNWFE4Q0xvZUJGMFBBaDZIZ1E5RHdJZWg0TVhROENMb2VCRjBQQWk2SGdSZER3SWVoNEVYUThDTG9lQkYwUEFoNkhnUTlEd0llaDRFUFE4Q0hvZUJEMFBBaDZIZ1E5RHdJZWg0RVBROENMb2VCRjBQQWk2SGdSZER3SXVoNEVYUTh2RjBQTHhkRHk4WFE4dkYwUEx4ZER5OFhROHZGMFBMeGREeThSNWVJOHZFZVhpUEx4SGw0enk4WjVlTTh2R2VXalBMUm5sb3p5MFo1YU04dkdlV2pQTHhubDR6eThaNWFNOHRHZVdqUExSbmxvenkwWjVhTTh0R2VXalBMUm5sb3p5MFo1YU04dEdlV2pQTFJubG96eTBaNWFNOHRHZVhqUEx4bmxvenkwWjVhTTh0R2VXalBMUm5sb3p5MFo1YU04dEdlV2pQTHhubG96eTBaNWVNOHRFZVdpUExSSGxvankwUjVhSTh2RWVYaVBMeEhsNGp5OFI1ZUk4dkVlWGlQTHhIbDRqeThYUTh2RWVYaVBMeEhsNGp5OFhROHZGMFBMeGREeThSNWVMb2VYaVBMeEhsNGp5OFo1ZUk4dkVlWGlQTHhIbDRqeThaNWVNOHZHZVhqUEx4bmw0enk4WjVlTTh2R2VYalBMeG5sNHp3SXp3SXp3SXp3SXp3SXp3SXp3SXp3SXp3SXp3SXp3SXp3SXp3SXp3SStoNEVaNEVmUThDTThDUG9lQkdlQkdlWFllV2IwUEx0NkdIUlVYMlBLeG1LR0V4eHdtc2lpVThyR3Bkb2NSNVNJd2FMRWg1ZU11Z2o2R0hSMmREeThacm9vaS9RNGxQSncvd0RpN0MxcDZkT3k1MUM5emk2dlptWHFYTDI0aktwY2lHRXVvaGU4dVJWLzhVWE5Yb2JLbC94Wkd4VTJLZGx5R0ZxbDVqVXkrQzllelpQUkRhLzhRM0liRHVoa1hOVTJUV01xWVdNYjdGems2RjdpOURaUXlNakl5TWpDaGZjWXJ6TDRNek16TGpNek16UC9BRGU0dmMxUGM4VkRGSit4NnFYSXY5RjYvRmtZcUlZNXVpRzFJdnNaU216S1lXcW54WkdScTBSUFl4UFU5Uzh2TWpaTXZpelJEYVF1dk1LRnhtWE5RdmNacVovMGVYK1RZbE1sVTFjWmN3MlVOajl6V3U5a05tcGNpTk41ZFV5VXlMa0xtbm9YdVF2ZWJTbWFsemFsMFRUWVJESXk3Ym1SOURaai93QlQvcC82bUpzUyt4aWdpVXYwZm9wcTJ1VDNQUkM1eTl1VlR3MFBEYWVHdzJHSVgvc2JDcVhSR0dOREtuNGVKVVF3M3FZVlJxR09aM3NadVV3dE1LSW5ac29YVVEyemFObzJqR2xTOUZRek1DMUxrTDFMeTZxbUdKeSszK1gzTlF5TmxEQ2lJWG5xWE9WQzU5Uzh6N015K3BrYmpQc3VSREpQd3N2dzh5OXlsMTVzbDVrWmZEZ1V2VlRDWm0wYlNtYW11RjdveHVYOFc1cWwrWmxUbVk1b2s5enpjVFNzMm1NWGtiYjVWNEh5K2l0NXVOVllqNU5NZWtQOXJ2OEFPYyt6UDRjK3k0ekw2RjZHWFpmMjUvajNtRnFxWElpR2ZaaVg0Y2k1cWxaVXFwU0NKRUwxVXZyOEdSbDhGNWZRd29YSWhjcFR2SFVMVFZ2NG1zZi9BT0JyMU5zMmtNa1UyRFpwMjVGeWRsL1psOGQvd2VuWmMweFdURllNVmc5QzU5UGN3eUY4cGhlNVM0eXFZV043TVNWTDJJWE1ReTdjakl3dE1WRU1UakIvek9zVnJFKzVUdTBjc2p2dEd1VmJGcksxL2lXSkY2bXlwc3FiSnVOcEM1elQwTDBRdjdMelBzdWFwc0dLNDJqTXpROU95NUVQUXpMM0Z6bE0xTTErSEkySGREWkw2SWJUZnhNU3FoNGhlODlWTXY4QWpyaXVreUluQk16NVBSbGZ4a1UrZWQvTHYzVUxYODNGUVZuZGFRdFA3a3lOdDdlYlRCM2tpOGltak5TRnUvMUt6U1BrNXFKWTJrM0NRZnhKbkoxQzFCcjRGNm1yV2prell1WlluV1ZydnlGM2ZMK2tvbWpTcW04UnpNTmZSZjhBRHN6TXo3Y3pQczlPM0pPemFNeStSRUw1ekZwQ2w4emxOcHltMFhQUEVQRkw1VHhsUEdVMm1yMmJkRHhGTlNxbTBwdEtaL0JtM3FYdlovc1h5SjdHMFpxVVk5UGN1czlURzVFTVR6YkxzUnEwUkVOb3ZYL2lMa012Z3Q2WksyTkJZdjRhMVViOWFsdVJlOGN2cXZaeFBSQ2prTUxWVk42bUc5U3NpMmVaUmlWNGxwODJ1M0tXOUhzM1pGTktnZlJQcHZLd1BYUjV0K1IzUDhZaFNTUCsyVkR2ZEMxOFgvb3lvcWVoM1dsWktkN0JMSlk0WGwxSlZUTk1sTEZwWTMvUzcvR3N2d00vd2JtcVlyS0dzbVQyUDczcWFpTnJlWmlldnNYdVV6WHR2TDQ2bUJGUXhJcGhWeUY3bC9vcjFOcERiYWJhSGlJYlZUYUxub1hPUXpNMDdiMU16TlB3bFJIZC9OOUtHdG5YUjR2cFlWMFRUSmZkeFI3NFp2MG56R2pPcjlxbG4rSHdXSEwvQUhPRmZwajNTT1hldHdsRjdjRVZyaXBzc1p4TlkrcThERTUzNVQ1WmpFSzZSTW5JdFR1Y3BYUllFV25xcFpjMUdxYXlDcWN6WHgyRjRvVTBhVnNqRi90Y1YwZXJmdDlERkdrVXU5Q3JtS3Flamp1NWxxbkU3M1JsN3ArOVBVck15cXR5ZTA3blNyMTNtQlVYK3R5SzZUS3lQbXBaU1NWM0ZHWEZxT1psT0tsSmRKYlg3YnlzRWlMei93QUF1VHMxa2pHKzU0cGZPaGhkYk5XMXFHS3ZzWVdGL1psOFdSa1pkbWZaa1pmZzVkbVJsOEcwYlJjNzR2VTlleTl2WmViUnRuaUhpbDBpRzIwemFlaWxyUzVHUnB6RnM5Njl5Y0JXYU92Y3cvdVZ2VmQ2bU4xREE0bzI3aWY5eDVWTExFS09pYTdqUXFrRkZLS3RsaGhSWFBOVEJZVDZuR3ZWWGNpa2JTcjhKUnZVdlcwcGVxbWRrcTNxYnkzTFN6eExMSmU3ZW5zVmhrU1J2VXBwTVZPS0YrSnE3MEt4S2pYOERWcjNqZHhTVFZydVU3M1JMbmNEdTlKcXgyOHRhSHBEbDRGbWFTdzdpMFh1NUlISnZSQ3hwczlxcTVDZDVJMk5WM2xZMVJ5YjAvb2NibXQvTXRDckZSMzVWcWJ1WlNXV3E3bW1DS1I1Wmdwb3pPR1phZHBNejNmbU5ZaXUvTXBScVY0SVlsUmljelZOVnp0NVluYWljVVV0UnVWMGU0MWpiSzhEQXRmNmZJdlZETXhQb2VOK3h0RjhsUFk4ZjlqRE14VEMrTXpqNmw5anFlblV5VHFiSnNLZUcvb1hzZDBNbE1sN01sTWw3ZlF2Y2lGOGlGN2pDMVZMbUhoWG1GcUliQ0w3R3pUMk0rejBNU21CVk1WVitDNnZaZWhlMHkvRnlNdXpJeU12aHlOa3VReStISXlNdTNQdHlOazJUSXlNdmlXVFNuOTJ4TjRzWDhML0FQMExXbFNPa1hpcGNVUktxVzlJZlpUY2QzRTFYTHZMYksyZHhkY1ZheHppK09wZlJpRlozMmxMTUtkRFlST0pUUHN2bzBvaTIxUERWQzI5OUsraFJMMU5hN0NXV0twOHZTdkV0YVJLdklvMXRWNEZ1SjhqRzdsS2FWR3laQ3JJWHM0R0tOelYzb1lWV1J2RXBwU1dGNUZkRjBobkpWTE9rTllxL1UxeFhSVjc1bjAxTE9tNk8rUG1oYS9oODJmOXFpU3VqVzcxUXN2VkVlbThzT1ZhZWhWME50dTloU3FzZHVjaGZJeFBjdVZGNWZoWEZkTTBpTm4yMXZGWi9DSXYxdUs2Wk5JNWQxYmpWYVNyVTNWS1N6UGR5TVdKVFZ0c29WbWVhaGxWM21zYlJPQlNKYWNTKzFLNHhxajNlalVLcXFRbmQ2YXp2SXQ1YjBYU0VZdTV4aTBsbGVCU1NTcWI2RjJreCs1YWRwTWRDeEF5V1plQmFuYTl2QTFVbGhkenk2aThqTXpNemFMak16TTBNMm0wMDJtbU41c3FYVlF6VXVjNDlTNHlObFRaVTJWTWk4MlVVdmkvY3VZdlV1YXBrcG1xZTU0dFBjdTBsREZwTFR6QmZwS0dMU1VMdEpWUzU2cVpxWHFwbXBlWkd5blp2TWtNaTdzdlJEWlEyVEl2ZFpMcEdxWFVMMWFiYWRseUdSa2JKa1hJWkdYWmwvUzVmaTNGTFVkZDFvdlJmaHJrbTliaGU5bFNSLzBzRi84QWo0MndzM3FsNVRUWjNPNEdzUzdnYXRISXBTSmlxVzVLVjRGRmM2eVdwblduYml5MUVaSHZVdTFyejVlQ25NeFVaeU1ibFUyYThTemJqdGJpMUtpbzBzdFJYdU5XaVJvYTk3bkdxaXFZRW9oV1NxbVdJbyt0Q3RNSmdZdHNyTkhjZkt4dGo0bXRrV3lJNk5hcUl6U1dZZDdUVlNKeWQyNUdLMG51YWpTSHRYOHhnMGxYL21OYTI3N1N6SmE1T1FxMjAxM0F4V25ORmJESTVxbHB6a1VySTdvSTJQRTM3aXNzTnAzMnFWbDBhVmliekRQM2EvOEEyRkpOSnIrVkNzZWx4L3FQTlE5VEZwVWZzWVpIdjVJZkxhTTV5NzNGbEplNFp1WVdwMGttZHZjVVZHSW5BMU1VamxOYkcxRTNIeTZKRzNlV3BLdmVVVmZacGhiUk43aldyYktJcU5Rd05WeHJaZjBOTUxhSndMMWJHbkc5VFZJNlJkNm1zd21SclhzYVdkRWk3eGQ1YTBwVWI5cFRSbzBiOTFEWEtrbk1xcVdSTzVmSTFxaUtyV3p4K3FwbVlIV1YzTy9EelUybE5wVGFNejBQUXZhMVMrTkR3end5NXBraGtuWmlWUzkwaDRrcGUrUTJwRFZ5dlF4NlRJZVlrUEZrVXplZjNsMW93LzhBQVpvWm9YZG5vaGlrUTJxbnFYU1U1bmlOTDNucXBocVlsVkRESW51YmFHZmJuMitwbVptZnc4TjZtc2s3NlQ2R0N0MGI1YUhobVduU1NxLzZyUlJzL2VOM1BNTFlXY2tMa2JLbjVTdWs2SEozdjJsTkZoaDBWbjFMZXA4OXBzc3kvUzFhSWFxSkdOM3FVVGFMVGpBbGx1OVRXcjM4dTVDa0ViWTJHdmZVc3hJVlZxcWExM3NoaGJlWXFOTlpPeE9SOHRHc2k3MUtLL3UyN21tT3E4UzFvOHRwbjB2dk82MC9SbU5sM2xZSlhzcVZTazNJcC9LU0o3RnpiUHNZVWU0cTJPenpNYXNhYSthdklxaUp6Y1UvbUxLbW9lMlJDajRsVnZBc3FpcHpRKzB0TnJhMzFMRU1scEU5SEZOTVk2TjI5Q3NNakhtSkNxSXFLWVgxTlkweHRaN29hdU5oWmthaUp5TGNOV0x3TExuV3l1anZzbXlqME1jRHpabDVVTUVUdmN4V0dJVmxjcjE0R0dQOXk1alU1bUtSRlhjeEN6b2tQdTR0YVRWNy9wUXhJa01acW1XbDNxVXROaUt5U3JLNDFiTGl1a1RJMU54cVdMelV5dEx1TEtNU09QZ2JDdmR4UFJpRnpFVmQ2bDcxNUlWa3N0NHVVdmx0ZmtNM0p6TE9pM04zbGRLa1V0NkE2cUlVZTFxcW04N3ZUbUt4eStwM3Voek1jM2NWUkwwRlpwam1pOXpmRXFsdnZiRHhLVDk0MDFqbm92SThWLzhBcVVpMHBsZHpyaXJGUnljRi9vTTArSEpURXFKelV2bGFlS2g0aUcyWElxbXdwZlZEYVV3MmxObFRKUzV4YzVwZStQcVh5c1BFcWVKUThhdnNiUzlDNjB2c2JMajFRdzNsekZNbXB6VXh5eE45ekZwVVppMHR2c2hjOXppNWpsUEJVeE5lMHV0bWJpNnJqQkdYTmFoNkg5cGlWcGl2TG1GMGFGekdsMUVMM3FYdVhzeVE5UDZQYVV3cXFuekV0WGZTZ3Roa3FPKzRWSFRPU0xjMDRseVd1YUd1aXZLMlZLUnhkU3F0UnBlcFppdkxVNzBMR2pOVjNKQ3ZkdTl5dWxPUlhia0xNVHJEQ3JXSzVkNXMyVFdPTG1kVFdTTWFZVmM5ZUJxVmppVGptVmtjK2IzTEUyaW9uM0lML0xhUzVuQnlDcWxtVlB0TmJFOXZzV3BISzVmcFV0YVBIM2FvZHpPdDVqU3pYSlVMcFYvVWxTc3NNRTZjRUtXSFFQNEdxMHFuNXpEM1VxY0ZNVUxoV3pvOUU1RmFPWDNLUXRwMlkwYXZzVTBQUmw1bFdJcUtmTnN4Y2lqV0pUMExYZk5pZHdjV1hQU2RxRkowV0pTc1RrY25Ec3hzUTFhMDRGSkdtREl5djdMbFBRMlc5TzI5VUtxN29VaGltZCt4amlvaFpqUmthRmR0KzlUV2REMFFyTXJuY2lrT2p1VGlwbVZjeEZYaVhYZkJXWnlOS1FOV1JUQ3ZkcHdNYjNPOXkvYUxrTHFsWlQwcHhMY2JtMnR4WmxkWk1FMW91THpjWTNWTURhbXcxREN6b2hyVW9KL0xTeWQzekxXaTZTNjBub3AzZjhYalJmdVFSWXNWZUpzS2JDbXdYUmx6VU5sREpDKzgyVU5sQzV6RTlqRktlSWVJWFNxZUk0dWU0OFZ4aWM1ZmY4UzVTOXlucjhOMURNdmQyWE9WRHhIOVRiZjFMMVZUTC9oTWpJK1piM3lHb2lZM21Zb0kzOGlzc1NOWGRVK1gwZG5OU25lUnhwOXBha3RTTzNxWXpDMVN2Y0s4cEhDMkpwV1Z6Q3ZmVjRJVW90VGNZclNOTWNqa01ERmtYZXBxWWYyS1JvMk5DdWtTbCtKVEpyRTNxVVdUdlhibUh5ZWpVVGVxR3NscHdRbyt0Kzh0ZDJpdXBtb3JVd3FKYlh2STFMVEtvV0k0bGtlcGJtY3NEVkw1Mnl0NGxYeEl2SStWbFJxL1NWV05meklKSE11TGlZdFpDcDN1aXZ3L1NWaWVuZUptMVR1dE5qVm5FN3pSTk5saVRtVW1sNzF1OVMvdTNjeXVrdWhpNU9OWHAvUStVMHFPVGdZbXFYZGxKV29WamNwVlluUDVLS2thdWkvTVdaRlJ4YTBkVjVDTjB4TEM3eXNMMGVud1pwMjdTR2ZaZWJKc2RFTUxKT2hrN3R5VlRERTMzTDNNYjdGWHZjNHU3Y2I3YnZwYWFqUjJvM2lYcjNTN3pYNlhiNEZZNjJkOUNqbnVjN2NoU09PenhLdVNxRnFxRzJqVjNGaHlWTG5VUXJNcTJONVgrSDZWclBwZVdabVg3MExUMkxRd1htTjFDeXhCUDVseXRFc3hMTHpOVkcyUDJIU3lKWGtPaTBpSmFienZQNGZLamsrazd1VkxFaGhWeUo2S1k1R3VSTjVabGdUbWhidE5ad1ZTNlNOZjFIcDErREpUSmY4QUNycFVjVjBoMGJVS2FQMU1TMUtOdlV4WDhESzhyUFJwcVdONW0waUdGNzFOZTlVOXo1YUp6dUtsZEprU1BnaGN4WkhiMUtKU052QXE5VmZ6TURVTWJtc1RpcGltcitVcG9XanZtVTFHanNpSy93QVdrZlkzTmVmTFc3ZjNHSHVaSXR6Y3hYVFFUUVBUMUtOL3Q5U3pid0NXTTk0anU5dC9hYTUzZHFhcFVWTjRsTklyOXBmL0FPeWlDcmZVd3lXazNLTDMranhPRmJZUkUzS3BWMWE3cUZyUk5IY2o5NVIwYkhKeE5XcldDMjUzWDdqeDVlcGpjOTM1bExrVG9XNDduY0N5K1pxUDNLcHI0a2MzZWhoVlU0S2JhRnlwMlhvaHJtVk1LdlF6VkMxb09sdVl1NVNtbHVaSnhUc3UwYTJuQStZZ2V4VEM1MW5pYXR5T0wybUZPejA3YnV6MU1TdGJ6VTFrNk9YYzArVTBmM2NZR1I5REYzUnJkRnRjVUxvcitLbExmZHQzSVgxVTFiV3Q0dU5aSTZYZzBxakdSSnZjV1pwRWtid1F0YUhKSEc4dmFrdkV4MWFlcmtMVVRsYXBZMGhxUDRsekxUZUpWbUhnVnlWTnhaV1NpOFR1OUxTMG04cm82S2pSYXV2Tm1vbEVRMWpyeTV0b3NPUk9ScnE2TEt1OHQ2RnBMSlU1aUpPMVVkdkxFcmtkek1PeVlMejVoMTI2cDh2STlxOHhGWFNaS2N6NWFkM3VYeU5melFwcTJjVVBNT1gyRVZkS2txb2pwSkVrVGlVblJZMUt4dVJ5Y1A4QWdNakpmeDhsNkd5dlEyVk1sTWpJeU1qSXlNakl6UTJrTG5JWnA4RjVrYkpzbE5HUk9aVjdsZDI0citSZEhJempRMWFTU1BOaVJlRkRHaVJONGw3Wk5Jay9ZdlJtalI4TXpMdlhiM0YxM0JPemR6TVVsZURiekJDOTNNMWF0aFRnVm1rZS9tcGthcDZ0UEdrNmw4c25VOFdUcVhTeWRUeG5xWDM5bC93WWMrQlZ5T3B4TEtOYXBzb1p0UXZjdlpsOEZYM0gybG1PNUN5aU5xWGxXM0x2UXNzbDd6N1pDbWxzWFJwUHFia1lGYlBIdktPYzZGeGFpbGM1T0NsSlhOWG1ZMFQyVXVjbmJoYmFNTUtONXFZbFlZMk1jWW92M05YR2lHT3BTMDlQWXhMTTRxeU4vd0Nyc3czbGRJbFJ2MmxOQWkvVTR4YVM1T0RUSExLNzlSYTBpU2pqVnJWcHJaMVltNURVUjk2N2U4d3VSaWZTMDFxTFhtZlNoZFhtcHJYMjErbEQ1YU5JMDNxZk15cTVkeUdGblV0d3k5enlMR2x6ZDV4VTFVclY0R09LcUZITDNhOGlzRDJ2NUYxZVNtc1lyZVJnY2lteXJWTE02V2l0OU54U09KNmV4YWJFNTNzVWJIM2FGWm5HTjFTdWpQc1BRN3IrTFJvNVBTUTczK0h1NzJIZ3BTMHQzOXFtSEFwaXRHWlJNSlY4ekVhWWRJdGV4Y3BycEhja0xNRU5mdWNZVVYzQkVFZktyWStCM2FQUzBZbTFidlFzTWU2SjNNcEpJdFBSVk5kRzJWTjdEV1c0MTRvYXFhTmZjMys1bCtKa2JLRjdHbDdVTmc4TnhlajBOcDVtODJYTzVtR0JwZm83VEZBaGRDWU5IUThCcDVkaDVaaDVWaGZvalM3Ukc5VERvMFpmbzhSNWFNOHRFWDZNdzh1aGRBMHVoWVlZNDBQN09obW5Rei9Zei9wTUVhKzU4eEtqZURieW1pNkpKTXYxUEs2UXJJaytscHEyV2wzdU1WUFpDNWpUTkU1SVhOcVgwUTEya1JwN2xJa2tsWDdVUGx0QlZPTHl1a1N4UU40R3ZuazB5WDZXcmNXZERoajBabks4cks5ejE0OWxTbGxxZkJoS3pMWlFzd3hOL01wY1hxWFZVcTJKV3QzdXVLYVZwTGE3bVhsdExUbS9kY0t5QjhjZkpLbFY3NlplTnlHcll5TXhPN0xrcVpWNEZseVdCTEMxVXRUSzJCdTl4cW11MGwvMUxrVjBtaU5UKzFwWmhaZ05wc1pnYmFYZVg5bG1lQkhmYzNNd1RJNVBwa1F0YU90Vy9TaFRTWTdLOGl1aXlPWndMT21RSkkzNmtLNkhOWWQ5TGpGRDNxYjJLVlh2b3VaWlNaaUx1ZVZuanEzNm1IOTVoTG1LcGRHcGhqUTJHbDdZK2hkM1NmcE5kTWlKME50MDc5eUZtS2tET0JWNnE1ZDZseVZNZEdtQkx0Nmw3cXU0RnlGeUZwV3FuTzRwSk14bkJwaGlkS3U5eFRSNG1zYnlQbXRJL1NoOHZEK3B4OHcrMHYwc0tveEdweDdLU1pGN21QNEtXa2xmbzd2dFUrVjArS2RQcGVVMCtCcUp2SzZKcEhkTHdjWHpRenQ1M2xKbXFuc1ZWVVJTa1V6RjVsWUxGT0JabGFxcHhRcTFxZERDMUZqRVgxM0ZJSDJDdWx5MjFNRWQrOHBOa1dkQmNybS9TcGJZa1ViMU5kbzdsKzVwUlZYazVERkN4NkZxTnFNNEZpUkREUk9aamYwS1JOdEtXbldlUlNPa2FjRUt2Y3J1WW44dWkyaEc2ZWpISWQ1b3JrWklkei9FMlZiNlBMZWh1dHhjREVqWDhDcldxaW1EU0ptOEZjWGFUTCtxOUNyNDR0SlQ3RnZOZkRORXZJOHhaL01oNXFNODNFWDZRanZ5bEk0Sm5wdk1iblFyOXhXQjdKRTRLWC84dmVpdTVtRmpHK3h0ZEM1T3BycDRtKzU0cXY4QXlvYW5SNUg4N2o1ZUNOdjduaTJmeW9heDBxcHZjcGEwL1NXOHFsTkdZMTd1Q1ZLYUpFMkpONm56T2tTTzRKa2J1eTh1TlZFNVRYeVJSKzVyTkkvMVExVWJuTHZjWVc5Q3N6MnQ1R0NyalZ4TFRlcDgxTWljRVBDZkk0U3hva2JFM3FJMXpKVlQ3QzEzS0p4bFVzemFRNXlKL1pFZkw2UCtweFZlM1dNVnhxMFNOQ3JVcTdlcGFlb2lSNS9haGEwaGpxYjNtQzh4cW5zWFhKOFBndGs5ajVoaU0vU1YwV2RZK1RqQTZPZHYzR3VpbWlYZXhhbXEwejJrYVh4eFNwOWltVTBTbmlkNG01Nkh6ZWoyWGZYR1UwSFRMVFArM0tWZkFyZnVaZVVsVlVYamNXdEdrdE4rMXhaYy93RDJReGZzYmFHSEVVam94RFd2YzczN01TbCtJcEMyd2hlbmVPUHBhVjBpUzI3NldsSVkwamFhdGI5OURHcjNlOURYU0luQnQ1OHJveXUrNTU4enBGUHNqUGxvUDFQUG1aYS9hdytWaFNQN25GWDlWdVErYjBpMnYwc0thTEVyVTNxWEtVbXhGWTFLSksvazRyS3hVKzVwV0Y5ZVpSeUlwalpSZUJoeU5XNXpmY3hxMlQ4eUZKWWJ2dEtPZlkvTVYwZVJpOGk4dkxNQ1dVM2xxZDFwVGdZWE1jcThTa2Y4UWtpKzE5Nkh6Y0dpYVhGOVRMbEY3cHo5RGsrbVRJeVNWdjFNN0tyVlVOVzJ3M2U0MTBsdDI1aHE0ZXBhZFJDc21CcWVwWTBkTGFKblExbWp5cnplYXFhZlJuY2NqV1N4Nld3ckNyb2Z0TGxSSDcwS3hVZVdkT2ljbkZFUGxwbXI5cWxVMWJqdTlQMWN2L2NLUzkzTEd1eTVDcU5SVzhDNUVNcUY1anZhZDVvYm54cjlpbEVtYkpUKzJSQ21uYUtyZnVaZVlaa1l1NTl4cTNzZHlVeU1sTWpKZmd6UTJtbTBobW5aZXZiY1pHeXBzcWJDbXdwc0tiSnNtUmtaR1JrWktYbDM0VzAzcitGaTBpMytScHFvSHY0dVUxU1J4SndRMXMwanZjcXFmLzBveHY3R3N2WGNaV0dHc2Nrajl4WmgxYkMrcXFYcWlHRW85MURWWGw3VVJONnFWMG5TbzJJWHZrbVhnVTBmUjVxRmY1R1pxN3k2TjFERlJ2TVJPOGVuSkJIT2t0L21jWHVnajk2bG5RcEd1NUZxYkVYUFNGbkUxMGo5TGwzSmtXZENoWm83ZjNLNlJJOS92OEZYWkZtSmw1ZWpxN2lybWxiS05ieEtWYzkzQXdKRkJ2Y3Q2bUtXWFNsL1lzNlBvOGxPQ0d1V0RSL3p2TmZwcU9YZEcwMVVVa25GeWxsckdNcWQ5M3pGVGNoUnlPU2c2eXhxY1ZITFV1Wjdtb21XdTVGTVN1cHhOWXlOZlk4T241VktLNTNKNlZOYkVuTmhxTklzOEhuL0FFNUU0T01YZU1LT2RFLzh5SGhJbjVIRzA5bk0xVWpYb1ltSVhJcUY3dXBpanJ5TWRXbUNSdnVZR283a2F4MFRmek9QbG10ZW05cFRTTklpaTRLOHRObGpjbSswV1VuaFYyNjBWV3kxTjZxWVh0ZnljWE5iN2xGa3NwdVFxbExXOVRFL29abUtxbU8wWkd3WUxoVml2UXhwVHNvOVVweEtzZFJlQmZlWExRd3BVdmF2WmNYTktvcm04bE50SHA5eDh4R3JlS0ZZWFcxM0ZGWTlqZVhaZ2M1T1NtTlZYbVhPZW5KVFdPVjNNMWIzdDl5K3kvbUovTVJLbkZDa1V5ZmxXNFhWVlRlVy9WQzljdlFheU5iL0FGUXc1OWxrcm84aXhxVTBxSmszRkJPK1pKQTdlZ244cnBqVjRPTmF4a2lieTB4cXh1NEZsOGxybVhVVkROM0pUVXlVVGNwOHhBaS9jdzFVaW91NXg2S25BdlNodlFyWm91OHBWSHQzS2ExbmR1S3dTcDdPTlhOTW52VW91bFNJbklyL0FEVXhkcEtyelEyNDEvU1lraGQ3R0h1Ry9wTlpIQS8yTDlIaE1HaXNSVFdReHFuQTFrTG1GNzNOOWk2Wm51WXBtK3hodHU5akUyVkM3dmxMbzlJTVN6TUw5SWtUMk5YcGlmcXVNV2x4OVR6a2ZVcXVseGY3RkhUdWYrVkRWUDhBOXJqVk1hNzlSaGF4cGZNcWNqRzk2KzVxNVhJWTVYbUNWM3VheU5qK1Jmb3p1cGRvenVwZEFpYzFMdTZielBNUk01SWF6VGFsWTVLOG5HcmtsVDNNVFd5YzBQbU5EWG0xVEhISzMyUCtwL3FmMzlEKzlmWXd4U0tmTFF0YW4zRng2bHpTc3p2WXM2T2xFNG11a1JxR0JFa2R4S1c3RGR5Rjk2bDVka2F4SFBjYXFGeldsVlNxOFNrVHJ5cjVIY2lzOGRXNzFVUmtEVXJ5TEdpUnRjOWZXaGIwMmF3emRrV1kzVzNjQzFNNUdKdUtJcmZZcXF1UnZCVENsWDhTMDY0cklxSy8wUVcwNVdSZlFZYnUyOHdzS1F0dEtJdWx1N3R1NURKamZ1Y3B0ZDY3N1JmNVhSYlAzU0ZyVGRNZ2pUNlVLUk9sbGQ5cUZJZjRlOS81elVhSkhEN0h6dW5wQTNjMTFEVnZrMHFUNm5MVVdsRVFwSXFsSWNSZmMzY290aUp6MzlCVWRZZ1JON2lzcm15TzVsOHJHeDdrTlc1NytTRmxrSy9xS3VvMHhPTUxlMjZwdHY2OWx5dU50VGFMM3FYUFV4TmpmK1kyMGJ3YVZ0T3J6TEt1UkU0SVVpMGlWcWN5c3pudlhpNHN3YVJORzNjMXhXVnpucnZjcFJIdlJOMW9xMnFMdktQbG1jbkY1YTBhVjdGNWxoZTZYN2x6SzZSWm1adW9KYWtTRis1eGdramR5Y1pIcDErTEcxREJJclR6QmZwQ21zbGU0OE8xekxtSzNrcHE1WEp6TUQycVliSjZHeFgzTDRGTDRYbFVZOXE3MExNaWQ4M2M5cDh6b1N0WGV3MWIzczVvWUpFVXBiUkNzVmwzSlMrSlRIRzVEZDJhcHk4ald3MTRvaFd5OUNxMXFYOWx4ZjI0RzE1R0IwcmVaU2RxT01hSzAxY3BoY2pqRTFEY2VoaFZVTVZIR1ZQZ3VMbk9MMHFiSjZJWW50UXhTVkxxcVhOTGtRdVV2Y3BtWjl0eTFMN2k1eG4yWG9oZTFESkM2eVpOTWk5REM1N2VUalY2UTdrdDVSekluOFRZaFZOeDh4QTlxNzJtMC9vVXE5dk5DMUhKRTczTldyUFpTK3BlaW5wMjRWVkR4WEY4cmp4SGRUeEhkVEVzamk1cnVoNGJ1aGN4L3dEcVlyaTZOcGtoa1hOTGphVXZWVEl2VXd4MVhpWTFScWNDNG8xOUVNVDNGR21OeUd0V1dUN1V1S2FPMUlXL3VZVld1OHh1Y3ZOVE12UTNGeGFsZWxyZFVzeFNveG5BcTZWWHUrR3RPcGpjcXJ1YWZMNkxaKzU2ME5mcHNNWENPOVNxL3dBeHBUdnZXaUZJR3g2T24ydHFwODNOcFQxNTBRdE5zV3Z1Y1dZR3dJbSt4VXVucy9sU2hXYlNaZjhBWXZWei9jdXVLdld5aFJsL0VvaUlrbS9NdFNhZFRjMWlGblNKcFVidlYxQmFxNlJlZFNpeHVvVzA3aHJPT1paMFpxYzZHSmZpNC9EZXBkK0psOEdTS1lWY3prcFJ1a3owL09WZFBOWDg1WmpsdHA5OTViL21GYndUSXM2WEgzaWZVaGZJckYzT0t3eU5kNy9qWklYdGFYc2IwUERhZURIMFBBajZGK2p4bXJZclB5dU1NanZjeDJYZXhpWTAzR3JlcGM1RkwyTWQ3R1BSMjlEd0tHQmhjaTlsNlZLU2FNMVRDeEdHTkVVeE1ReVV1VnlHcW5jaHFwbXJ6TWZkbUZXcWJIN213aUdKekVOdHBzV2pGQzQ4TjNRMWNMeldOcys1aWVacXBzbHlGNmx4aVVvMHE5VEQ4VnltSXV1K0xQc3lRdlE5UzUzd1pJWUZjM2twZE5OL3VZSnEvblNwODFvckpPTFZvYTVrMEJoMG1WL0JHbEpOSW5oVGU1aGcvaXFPWGRrVlpJNlhrNDFqVy9xZVphUC9BT3pDa2E4b3pVYUZiL1FVaTBQUm9tNzNIelVyVlhjMWhqaVIzTlBneU1pNUVQUXZlWGZGY1k3eTY0OURNdnIyMzNGRy9EZGZ5UERzcHZmY1ZubmJYY3k4cEhHNTNGeW1DV09MZ2hySkh2NXFYZGw2bDN3WG1FdlNxbDYwNW1idjBtRnJXY1hHT1cvN0NxVlhtWFJzVmVKaXNweVQ0cmwvQ3dwVXhYZkJoU3BpdU5yc3U3TSt6RXREeEM1NkczUXBiVDNMVEpZWkU0T0tQU2hnVXY3TFVUbGF2QXNLNWk4VlExMUpFTWJsaVhpYXVScnVTbVptV2U5YlUyay9BejdNL3dBUzlPeTR1b1pJZW53WktldlptWm0wYlJoY3BmZVhzUXVZaC9hWm9uc1ludjZtdmdWLzZpK0J6ZjFHQ1Z6Q3Nla3BUaWVhalUxYXRlWW1LYkRxRitaZXY0V1plWGZpWmR1Znczb2hxSkpJdnl1TVV6My9BSnJ6YWIwTDFSZTNhVTJsK0t0REVpS1hKVCtqdlV1anRmbUtSMlkwKzFEV09jN212NGZvWHFaS3BxNnRONXRGNnF2OUZjNnE5bUZhR0pUV09jdkl3UTJ1WjRUR21GYUY2MTdMekNYcjhPSmxvMkVwdUxtV1MvOEFZdk1MNkdDa2lHS3JWN0xsTXV5NnFjaWpaRlZPSmZWT1NsVGFYcVdVVXBQaVFxMXhtWm1abVptZjlMZVgwUFF3bURzeE9ONWUwdmFockVLZDJoc29oZ1V3dXIyWktlcUcwNHJuektWczhpOTdsVXVlcUd2WTZYM01HaW9uTXVTeitMZi9BRmQvYmQveStNMVRrVTJTOXE5bHlLYko2SVluTkxsdGNpc3JxSnVLUXQ5K3kvOEFIeUt3cDFOWlo5a016RmVZYlNISDRMMFBVejdNS21ORE16K0xNejdNek16TXpQc3pNelB0ek16UHR6VTJqTXZMek16TC9nek16YU41a2hmVDRzS0dmN2YwZDZWTHJ2ZzFscjJNS0xUOEgwTDBQWC9BcmkrNHd1UXZjcGlVK293b2pTKzh1L0N1L0gxckxSZ1Y2Y0ZNS29Yc1doZjhWempQNE0veHN6TXo3Yit6TXovNVRLcHUvd0FJdTdhbFYvQ3YvbzhMMU5ZakY5aTVQOGQvLzhRQUtoQUFBZ0VEQkFFREJBTUJBUUFBQUFBQUFBRVJJVEZCRUZGaGNZRWdrZkV3b2JIUndlSHdRRkQvMmdBSUFRRUFBVDhoK2NFSDdKOGpQbUo4alBrWjh6Ri9jVDVpZk9UNWFmTHo1a0wrOUh6cytVbnprK1hueU1YOXlQa1I4L1BucDhqUGxSODdQbko4OVBrcDhsUGtwODFQbXY3UG1wODFQbGg4K1BreDh1Ri9iamY5NEwrNkh5QStZSHlBWDlpUG5SOHFGL2VqNUFmRU0rRVo4UXo0Qm53VFBoV2ZHcytEWjhHejRIMEpNLzdIcDMrbG53N1BoMk41L3dDbCtrWVhmOHJQOHJQaVdmNFdTRC9wWi9sZW0vNFdmQXMrQlltZnBZM2YyNlova2VqZjVtZjRHTDVRK05aL2xaOEN6NEZuK2xud0xQaFdQNVVmOUN6NHRud0xQZ1dmSHMrTVo4SXo0Um54alBqR2ZDTStLWjhFejRwbnd6UGhtZkJNK0taOFV6NEpueFRQa2g4Y3o0Sm53VFBnbWZORDU0ZkpENHBuelErT1o4VXo0Um53N1BobWZETStHWjhNejRaazM2MmZCcytMWjhPejQ5bnc3UGlXZkVzK0paOEN6NEZueExQajJQOEFwMmZGcytEWjhlejRkbnc3UGhXZkhzK1BaOFN6NGsrTFo4MlBqMmZOajR0bnlZK0xaOGV5V3pla3llM3VqNXNPSTg4SHJMUjJNV1lsWStEOGNMTFA3NGVMZVovWWdwTDUvWTYzN0l4S3lmREgrMUI5RFhrSnZVdVVJdzN1SVo1UVRuOWx5KzcrL1FGLzBPTEw0UzlGNmE2OUVkRHFJcjZWdnIxZG9vd0lFTkMrc0hIb294K3BEdU94SDZBZC93RGs3djBNY2VaaVI5V092MUpzTU9QMFQ1RktJb1Y1dTBaTFRvWFNINFB3Y1JjUVBPTndueU8rR0dtOEUvTEwyb0VGY3lSVUhnb0NGK0pGdWo0WHJBZ3IvakZqSXpKLzhkUDU5ZnBaQmVzV3ZSYS80ZWhQcjZtUDBmVGM1K2s3K3Y4QXBuci9BTXVNSDMwOVpMOWNlR3drN0JxYmowYU1HUkdyQVNPeGRpUGp4alVOSFZuVFMwYzhITkhVZ21WRkdLUkhmWTlBRHVtT3hTemlTaUNIYXFsS2xOSXJ3bXhheWFNSTZhK3NEK3JYcjZtUEVCSnBYb0NYb1BYNkJSRmY4SHdBTDZ2dFNIL0RBV0VFZlJZSDY4Ny9BT0wvQVB4bG9sLzFuTXhuU3ZCOUlsUkhrZlJWdXVTQ0FJSG1KbEdsNk15NTRMTk45RC9yQzBMN0NJUndGY3FKT3NJcUc5a2k5V0tXb3Bpa2kyQ0ZhTkNoL3dCaFdQWVpnTXh0T1hCeHU3RFQ5SFgwUkdqTFprOWhhMWZUZ1d0Y3YreitHQWMxcG9yL0FNa2ZwaUFBYmIrbjlhUk1aVU5sc3ZrWVhoVWkyWlEwdjRoQjl3UGF2bzU3OWE3ejlqL0VIVisydTlGTEtlQ0J3M1l4UlZwMmxJWFFWSXllQ05VY3lkU3VSLzdBeEdpWFkxNUNiZm9sNlpCNFVEY20yWXVpcEZoR2RQc2tDWUZ1Q0VYTnNSc0NxdmxGMDk4bDFCc0I4WVJjMWNEb1plNDZ0TFpGd0xLWWU4eVJPa0VGTnlveUdMMWFRSWtkaExJUnd0ZEpyY1U2aVFSa0UwWTl5U0Urei81WUwrcnI5ZXdmWC9LTUxNSTBRUi8yZy84QWpLTVlSTDNZNkp2aXBpRHVoa2p5TUxFTXNRV0NiZHNYdDFGYUhEOUVqRzlvYXJzaTZENkZjdmszMG5iTmdsRmoyRTM5UXNyRDhzbU53UHgrV3ZrT0NiVkZPYzdDd3BHQUpBTmMrM291NmpmKzd5RVZ0K1FUUXg1RTF4NEJ6VTdkN0lsL1JJOTd3WGJ4aGhRdkFjQWpiTmcrRFBYd045QytCQzZNT0JPNWIwUllnUU9rWDl5TXo4b05tbkowRVgxRDJIODBzWDAyQ3ZWcGlLdVBWWkVCc0ZjMkRLQUM1TXZBaEJ6SVpXMXdKWHQ5c2x0NkVLcFhEcHJ5MU9ucXIxRjZRSUlMMW1lbW5wcUwxSjlmVC9UNlF1NkhUU3YvQUFQRFgvZ0RwNlFnajZoTStna1dCT21CU1ZVa0tGTDNReVYyZlpXWG9UbGNWa3dhM0kzdVprbG9Sd0VLNnVKMzk0Nldqd04yWW11cm56b0UybTFaRXd4U3JFZU5OcXdNSE1nZ3lLR1pyRXhya0p1NDJKYUp5ZFltYk9qQVBzYk1ocEtTVzFSS3NIWVNRa3VLdWduM1NGMEF5cTFzSktmY3NVUnR6MExHZStpQk0wdVNLTkhJOHl1bU15VDBXallia3hPc1lCam1CbkJoaFRMU0cwUjRFc3BidkJEMkZVTHNNYUpJbDVXWUY4bkxKUTFWeERMMkxlb0xwcWRQV1lpdEpGRmZROGwvdzRIMTYvOEF0TnBmQk0vSUMyaU5TQ05JMGdnZ2pSQWlTVzV6RG1Za1pISm90NHR4bG9ZVFlaUXFWd0pWVGVSSElUMlNTeUR1bWtObHh3VFk2NkVRMkxkMk1Xa2FaTTVFbUNXd25XQjJCd0RZTGRKaEJTc2ppRXNncHIvb1lOdWhTMWNiVDZKUUcyTS9Bdy9ES1BaZ2RQblVETitNak13MjNUTm1QWU1EUUpaa050aHVuWVZXb21xR2RTQzJJSFlLTUd4T0NTbDc2aFZEbXRsUVljNEhPN0dEREV2U2krcCtBdlJxL3dDQ09FRi80a3FRQ0FnRWFJOVFvSUkwUjZnUVFRUjZnUVFSb2dqNlFPZ2dqU1BRVnFJRHJzR3ordzhvNHBmZ0NUWWYzZ25NTHJSMkEwUVVPRWhyQ1dvdnNOQ0p4SWRvaDdKd2w2U0hlaHArRGsrd3hacnlVcVV4THI5aFArU1lFUTRiM2FHYlBBZGpIenBBT3FKR3FJa3JuQ0psOERUbjNDT0lHMW9iYk9nOWdFd3hEd0J1d3RCaGcxaHo4RlA3a1dVR0xta1JOVmFFdVNNRzJ2R2lXK216YU93dzlTdlhTWDFCaCt2cjhRWHFHZ2dnalJOQ1FSVHVpQVhYdTR6UnRwZ0hHK2Jhc3lmL0FFNEQ0UVJxUVFSOUl3UVI2d0lJSUk5WUVlaUNDQ0NDQ0NDTlJTd01ld20zUW40OXpQblEvdG9oKzdRYTZwSGlNWmlMZGZKL1lDR3hqNXkvR1lhamR5WDRtd3hVQWFzREVVZ1NtZVMyZmNZUlB3TnJNWEZqL1RFclo2S3F0SFZJaGYyaE5kc2h2azRBNUUvSThMUHdUZ1dWOGpkM25Ick0za1EwRDBINk10b1FvS2lESVJsY1FtVElLUW5MQzJ0Q1RIQlE1RVdFUzhENWFWb1dvajBwME9tb2hINmZmcjZUNExScmNWTWEyMWN3Y1FsNGhFRVkwYUJ2a29ySjFaQlF0aWtTcDhKeExXd0VvRWs4OWtpVGVlNUEyQmFiZ0tia1JFeVVWdjF6bXFJY21zQVJUckVqZXZhQXN1bDN0RDZnUGN1S2tNREVFZjhBT0V3RTBmVkgralNORWVvRUVFRUVFYXhvaldDUFdXdDdrMVpuTXpuSElHeTdITWNoeWg3d1ZreWorZzM3RllUVURMSkR6aGxQNzZDR0xyd2Z4TWhKS2dCenZKaGk4bGcrOGY4QWFHQy9PbGJicDVrSW8xSXQ0MFViOTN5Sm84NGNWaUhmZTZUWmU1VmNwa3JzYnl1eTFLVVYwR2tUQWhrL0EzL3FLK0FLSmRsd0hpTmY4TEdxc2ZMSXM4dUJvMEF2N2w5VEtaSU1NUDBFb2lPSTJHd2tKQzBGOUpmNCt1ZEZhQzBFOTR4SFB4VWNMeXV5Q1V3cWpBbnNOMVkxR3FPbjdFbTBLZ25mZ3A3VTdZa3NiNDRHVFZMZERwQVRHRld3akFUWVAvRUdSbFE1MFJGWGdjU1JzNlV2QWlWZHJyWld3cUp5MXlPVFo2dDNFdTdwQlQ4UWlwdDFhQ0dMakNBNlRkZ1NDYXM3QzliYUNQOEFsQS9FSUlLdm9BSStpUVFScVFRUnBIcGpTUFhPaWRTU1I2UVJvZ2dnZ2RFSndZbEVOaG9OQ3V3MkpuTXpsZTVWNWJGNkt6b1RkbHAyV1Yyc1RTcDBMQ0tzU3plb2EwSHNQNThqZGRua2tWRExDVExnWXRKN0dJTUVzODRYbCtTOU42SnRzY2pZa1RKa2lZM0preHNOaHNUTFFMeUtXRGgvWVIzOTh6dkNPeWJ3TTRYZy9NSVY4L0pPeDc2SXBaUkNIaEF0bVRnVk4wZXhKT2lHb3pnbGRzV2t3Tm1HUEV1czJQY1hSejdVTVZ1bWF2Y2hrZzF6ZFo5YS9JeW9GcUFTMVFzU1pIU201VXB0cnBqcGhLdkNVeVB3SEwrN0Qzb2p1TlFlMnVRdGt6RG9URWlZSkVxcFN5UmN6ZVF1VS9NSk5aUEVsTjI3enFIcjdpeU5nMkIrMEtXb1NUWHNZVWpDYy9JeFRYYld3Z3lsNFk0NGVrRWNQUTBSOUp2UnBIcmVlay9NZSs5MFJhSG1KZ0QvQUNNOWtRbU81SFlIMkVneC9SVlJyQkgwUUNDQ1BXQkJCQkJCSDFBR1I2TXhJMkluZEN2UVVDV2lmSkQyZnNWMmZzWDA5aWpaZTRsOGNJSU5YMGl4a2RzdHl6Ym9SWGd6TTNiSHJzNkhWWlk3SmpZalVVWElyQWxXQjAwSnBnak9CeXRJd0ZJMWxvbDNDR25Cd0UxZlRBUGdOOWlZZTB5ZkllK0h0RGJZYjdDTzczR1FnRGRXYVk4QWd3TFlOZ3hDMmdDOTB4VlVCUGlVTEpad2hZRU9GN213bnVKQ1c4YVJ0eWNET3V0NmlwbHN0VEpjbmhVQ2FkVHU2WkYvNWdsMTBkaWYyVVluSnh6TWZXQUxWbVFhbkozV3hwZzJFeXkyRWxPbGZFOTYrMFlOTjlqZzRLaUg1anJBM2tsMGJhUkx3NE55RzJiaVF0elhKYmI0WTg0RWdKV3piWXJxd2NBandwQjlJM1E4d2NTS3pMcW95dHFYV01pYkduU2JnY1ZERE9SbFdSbWtPT09VcVNGN2FSQkZBenkvSlBybWoxalJxdGxYdUtrTDNCUXEwTE5Bd2dkZ1N4MWlzRTdLTWc2TlFUcm15VmdXd1RUbmF6Q0xMZEJVSVpzeEFGWnRaT1JFN2dJWlNLRkNucGo2Z0JKa3hPc21iME94cFkvSTQ0bUkrSXFwTmh6VWQ4d1NoTURYWS9PcENXbzhqaUxjbmdLeFRBL3laenZXbkxDUjhVUi9vSmJId1JkdmFHMnpQRHl4V24zRUlYODlEUG84SnZ3aStUa08yVG9XVkNHbGFUVHE2OEY2YWZhT1AyYU1ma2gweVFTT1dPNlF0a3dwRXZFRmZOc1c2YU1KZSt3ZlZFaTFwRHV3MkRlUEZvdUJJU0RkUFFqQ0dWcHFIWXZZWXdOOWlhdWluQWx5akZ0Q29XYzFYUkZnVHNJWEVTZlFKaHRJWUUxWmpzSVkxWW5HR0o2U0VEaTBFakJ5eVZGVytDamdKY29IVmJoaHdiNzRDZUIwUkVsSkxOMVFuSk9ESlV0eUVCZHp3Tkk0UElyemk2TnV4N1NtR3lTRVZaYzhpRlNZbXdrK2tKRzRYSWtmQWtLYWxPRk9sTndyM3lsRlNLcys2SEZ6aERTVzJ4SkNXOWVPRW9zdEJmdDdTNVVvc3JDV1M2MjZEY2R5S3d4N0haeFJTQTJpYnF0RXhWdlA5eVVTZ0ZUMDI1SUpLYjBNWnppNU9nc3UrTWpvZHZ1QlJFcXlvM2FTZFkzOUpPQXl5MzBNa1l3a3cwcHgyT1hrT3lLQ0c5M0ppNkI4ekxXZTVQdTRIc2Roc29jZGxZcGlJMjVlUlgwM3JzaG0vWURGdUxXU3VKK1BieVZMM3BsQjljMW5VUEJNRXVLQjVoMjFSaXQ2Sldnc3pmYlVTZmJjUWt1bmQ1MEc0eHlEZVlTblZJcDRJNnRKWmZNemY5OGttZDNMd2hLVjN5V0FUZU1xalBZYW9RY2RVbHptWGoyaUg5QTIvaUdUaUVoeTFEK0FBeHNHOS9saXcrNlBnWGFVS1NGckNlVlBiVEJWaUZQc2lKZE9Ibkp6ZmxGdDk0Y2xSSTc1UzZnMllnZVZRU2JLRys2RnNrY3BQU0Z0ZzlnTnB0ejJRcklkTzV5TCtTNHU2TFJMTjJhZEt4RkxvSUdXRFRCWktHQ0RBYXZDRXV3c2lPRTRoUzJId0RUc01OaW14QzJOaERuaUIrUnhJaVlKaXRvS013Z1c2TkkybEdva0xSQ1doYUMzakxvcmNXU3JvTGM0amZaK3hJYkVTa3VaZ1FZR3pwSTJ2YWNHa3gyVVF3aVZ3MzU4WW1Tak1GcUcwZTZaSXZrYUFqSkk3ekpDc2dQc3JCMVI5c2ROdy9kdDFJUGNsS1RqQWpVRFNQY281WjVzbU9NUys3SU5MWVNFWEgyYUlQREVLT3FYSXRNQkZXZUNRMDZPc2xVbDdXZFJ5SmUrbkRDZTEyODBNYzFQM1FxOUorQjViK0RIemdlSUxFVTI3VkN5cTB5WlFSeUN1NGJUQ0xwS0dOMWhzcW1tWUk2VXVWUnRPK2luY1VCNWNPbklrdDJFZ2lsZmVaQ1lsbkRReUEvN3RpNGliaHNab3ZhRHVCbktNYVVNMXNNdFJ4NVZRYnNTT3B5cERFOE53N0VKTXEyaDh5RW1mWldPbFV5SXIxNWRDZkVRWDczN0tzZ2R2Y1V2eGxMNUZ3UWwybjRFZWFqWmxaamZBWTdrSytvN0JVbHV5RVpEYklsdVRMbzY0d1RUd1RvSG9Ub3ozSWU3OXlPeFdEWkVXem9Ia0J2a1NQNkgreUVZYm1JaXpiN3h0aEVxeWl6azdoSmRDY291aDVYNDdvSGVIeU0yQS9sYy9pQkdZM3dOZndCcnM3d2JTRHdDeGw1SUVDSkRVaEVMV0VORUVFTW9rR3JzMlBXNDEyMGRUcWRORDRIUWJiRGZabkEvWTQyTTdMc291YmlEM3JSZlZJMVhma0d0a3pFVmR2UXVvdHNHdXY4QUk3TThERTI4aDltWWlDUGQ4SWxhUW5BMm1qSGFtSms2alJjb0N0anRLV1pCYlJhS0RXcG9rdXlFaG1TMDJaSkVDYmJVanRZVENzcXZuRU1jaEtjaittWlUyeWhEUmdDTm0yWWczdllMSENxK1J5eW40b0VXMGg3Q1hwVVk5VnRzSDRvbFNoeThDS1RoUVFzYjNORUZ0dWFDYXhZcVk2YThOaGUwbThaT1ZZOTFSU21na1UyNlJVU05ackpPcUU3Z1Z1cUpXMEhOWW5jSnh4SzdJVlcyWnF0Qjk4bXhZcWVGQ1d5ckVISmpjVnJyR2Q3Z3BlV25MQllQcllKb2VkRWI0cWhVU0hoT28wV0VROXpsY2FaQ25Sd3hKV2pkVkdWVStvdnlYUW9rWEFtUTFrUnRMemNaWEgyWmg2eWluTnlrS2VKQTkvSklHMVhNcU5PSEtCY2MzRWFVVzRsVnpTRlhkU1VtVVdzaUIxbFZHOGJza2hoVGNYM3BJVktHQW5pRHNXcXoyaTk0QTU4eTFTd3NidHhoWGpyVG56S2tXeU5HSUZSRk1zSUw3N1pCUzBKeGxJeTdzWG42eG0vcElWRktrQ1ZoZ2NkWU9vNmVnY0pMaWxKUXNtdkVpbDB5R1NjUEJIVzVpbVJhaFVMQVNoN014TDJZbm95Q05KSkowdm8ya3h1YURoZnNJbXpUOGs5aHZ0b0psZ2FhRG40V1BRSWlTVjc4Q3JQVFAzRmltdjZuU0FqNzJreEI0RTgwSGxpYmNQd2FNTDZJZncxN0kvaUFKOW42REN2MHg3V1RsRXN2b1lGQ1VYWkVWRXNjQitMYy9OY0pEcjc0a3ZaRE1tNEs3UWovQUJEOW4wOEszNkNWL1FaVVM2TWtlQzlEOGlQMkJxQkJvNjFwSnV4OGpmTWlkbE03RWtRcTRSZEJzNyt1aHRwWWtiSkpLOUNKVUp0V2JFaTN1RUlJcmQ4dU03Q25ZWU9HZEEwblJNcnQxWlgzb0V5UEVJbnRKSmN2dEJzMExoRkZoU0h4c25rU05uRFozcndRa2ljMmlxSWlUZGJRdnVpUkEyQnE1SEJVNXVSNGNDWlErQ0NodmVYRFh1M3NJbm55RGMxWXBpUEhicW1LazNZWE5vZ1JwY28wSnN4S1N5T0RrQ1J6QmRxQVk5MTdTbWVBQW9oNGRJT3NiZUhMd2Vxa282NkVrTjhpbGg1WkZPdjRMelhiQ3NEeWlLUkxzMlNpbDNpcGhCWnpwVURsZG9acDIreElydHdoM3IyUHBaWTA2d09IM3BrTG1KNVlOMmtRWWJ0Q2xBZnhHN1FYL2xsSERXeVNPYnU5Zy9uamt4YmMwOGltbWtSVkk5Q2lpYXg5ZFVGSFJ0aWhSRGhIS2doUWhFbXlXbWtuaVdOS1B5eDY5eE1DQnc3SWRHemU0bGlzSllSaWdveWVSQk9veVdkWE1QQ3phTFNYTUZRU2JTTnZjT1N1b3N3bTVDcEIzY1ZUOTRNYWpGODFIbUlGQ2l0NEZKTEN0S2xvNEdKeHdWU0pYWjdOdjNCNEgweDJ5SWJHMVpBeXNDeWhhRWl1Q1VpVDRISjErOFNXMGZKSE14ZG5rVEV5T3hzVVVCSCs4RG9kQ2pCTWhpa1VsU0dRSUM0eVA1TWt2bjNDdElIY1FOb3o2Q1dQc0d5aThINnlKWFZuMkRDVWpkZHdmNzlNY3crSTJIcEV5UXoxSmE3RERjYmpZa1NHR0dHV0g2aEpFeVltRVk3TWp1SVBJKzl3aWhINEZBbnZnZEc2RVlTVzZNTXp3dFJrZXdDclViVzBEVklRSktkNVI0UGdVaXB1Mnh2T1ZCQzdFSFRodzJra205dUNCNWlwRGVjQmg3TTJ3Q3RlK0NCZytZbEVmd2s0MmpFU2lmaW1EUW5lTUxhcWwySmdHRThhbElZcVAzMUF0RUJGUkhaTlZEM3NaUTRGRldUcFpHaGE4d2lDVUorYkV1QlQzU0xFMUp3Rzh2bTFtRHMrQkR6aUlrYXg3dFJjV1NVU1RORkV1N2g2VGJpaU8zT1VqU2w5SkpCR0c2akcvdUZVM0NJTnk1SkJYS3VVVCt6SkNsWkIwVXVFTy9QUW1LMXlvVHJEVm5Kc3hNOGxWN0NSRGJMVDdKOG9jYnMrZEpySXk5aENVeUtXeWVSWEwrNEtSOW9NUGRpekNaRGlkeXRPWEZacHhJcUFQWVNwRmcxUmJPTjJKMmdSeU15dld4M2MycmxDSFpxZWJISXVaRmpkMkFTRi93QXJrTE1Nc3BoaVdDYkpZR1hTc2RabjdHY2wxUzRvNDc2Qk5yc3FwbllTb3NieUdwOVZzdjRxUldSUGJRcWkrcEhBb01Da1YrbEVqT01HN2drMGw4WEp2S3FMSytwTUJqWFNXUWlJYVJmYUFvS051ZzIyWTk4ak1WSC9BRWhPRzRvSmkrZ0x0OVRycFgwSURvZE5kRmNmVWhEcnBZZkFwMHZpTkNBMEhyckw0amNiTEEySkRZYkUzcnNOeHNOOWladEppUmhrbGdxaVJJbG9ZQVh0cGFJc2o3aUcyOVJ3Z3JESDVZcXNES0djZ2kreUpvRURHSGdzc2VGcEF0dllGUWlqamVFUklXUlJHamowZnFDN2xYSXB5M0NST09wQklwYnJzYk1sYm9VK1R0THFWcHk4QWpwTHZlZzNoZUNVSFl3R21NSTZsZ1FWNXdGSkVNNmhqNmx1SzdWcTBGUEFlSTFCUFlTV1RJMktDa3hKWEtvTmdsRkJDOHBReHJIMTVCZXEzV1NJbTNqUVZFQmFFa0RjYnNrV2M4S1JMbUZTYTN6YldMYytoQ0xhWGxBb0t4Ym9kWVdkUmVFZXgySytma2xiRXY4QUFFbHh1aFNDN2FhRUliRzVDU3VnVzRrVk5yamVXYjdFZTNjaDZCbm00SWswVDdGZ3pJalB1RTRGaUhoQ3VtamV3MVNWRzZSMmkvT1BiYVJHSGpDVVZ3SGF2aUNidVRyUjdLNFNMSVM1T1pXN0t6NUNJSXk2MGNzUWFuTjdxZ1RmSENveXg1aGlKU04yU29Ya0R3azhJZkZ1eUcxdlpoQ3FTS0xTY29SRUlzRTdaYVpiU0JxVW1GZDJOQ1B5aEZNWEVXcE9WWkdsdFR6SFJPNG8wb3p3NnNXTVVNeEtyS3FaRDJ0cGZDWkcyNWRpdk8zcEUrK3VqaTVNSUlpVlN3aE1rV3d0YVM3RlJaTnBSN2hkQ3l5c2JLYjNuTXE4SGJsaDBGNmx1bm9mWDFmV3VRUVJYQVhFWEQwVG9kQk03TjdId1JQWmpmWWFQcG9zMlk0RDZrQ0JBaHdRNEtySnZ3TXN5VTl2WUxwN1EzM0U5eExjSjl4elRsalpUTUVWWFNibWxwODQ1RVIzUXA2dENkNk9RSGhUUU5LSWtUSlhMSDJrVldFcThtd2lsdUp4ZDJ5MFNWS093VkxPSGNMSjJERUI5R3pRVEpsb01RVVk0RkxDN3NaOTdBZnByZWtsMHc3YWt5R3hYK1FmYlRMbTE2TzF6TVlIS0JTcU5MWnVSdVRXTFlvRjBNaDgyVlhRb2JJa290OEkxaWhNdUtQTnh0NDN1b0VKOFZEeDNld3gxYmI4aXFiQnNxYVRsVVRKM0NSYTdVb1d4R3c0eVRMS3RPWHNpY1QzaXBGU252REpQeXpBa2ozbVBlRHVoM0w4aUthZmhJWW14Y2g5amtpU3o3RFhKZko5a054eHU1S2Zhb2czZUl0S3VncElVa3dTWENIVzhHUHNHakpUdTdNdk1KRXVFYjhESTNMQnl5WTFJTnE0bDRJTXlsNVlmYWdkeDBuVVU2U0xVMk1sWm05RHora3BCdVdZZlVua1JVRWJtb002cE1RMmNEWmQrQmMwbmtMY2t0NHRQcGFFVlh4UnBsRUc4aVNybEVXSHlxU3RiaUczZnVHaWlObmNnR3R6R3ByM0U1KzJoeTVDTHFYa0l5RzRma0RIbFBoSXFETmhBa3R5a05VVEN1ckZaRk80dXVFcEVoNXVOMkp1VE53NVVGU1o3c1VubGtSS3IyUVNvdWEzZ2I0a1lDUUhYbDg0Z2dqS3NuVWkzSW9Va1VmM2dpU0JzNkpKU3oyTW9WbnZDSXRNd0NkVjNEZ1Nkb1RnUGVFL1UrSkVnUTJJN0d3RjBmcEV2NENKVjJmV3VaOU1ZOGd0VkVMOHRpY0d6QWhzUHdmd0ZHNysyUEw3V2lyMFQzOGtoQ2d3cjJ0S3pSWVdrclYrbVlYdW1DdkpDTmZneU00VFNpYjhRMjNSK0J2dkhzY0M5am85am9KM0ZkeXU3SE83SUlJT2hqWHFuWWd0NlJKcnB5UXZJdmlXak8xU29lMkVNVWRqcnpuYUoySWJBMjl6azBVYlhsd0kyK05xWnhQWUZzcjNhbUk5eTZLRGRwWUNjR1BacVJsOGVYRzBXWlBaRVBJZ2hmSlNpVVR5a2JNSkxKM1NDRUFncGJhS1JOWUV6eE4yU2s4Q1Mya1VrSHQrOEJNeWxldlBmTy9zREtoQndwWmVwNks4TzZDOUtNSGFla2dWbzUyRWhaeTcxUHhOcGdzQktzUW5QS0JHU1I0cXhLNXV6RW82S3pLS0k3eGlIdXUwYUd2WWlVTkRrVTNEVExmc0Vlbk9wSWwybnFCTkYxaVNLSFJ4SjN5UktJMVI0TXpmWk9wNmdiK1NQMzBZYWRDU01xNlFwMzJjSlJSSFNJRzFuRjQ3ZSs4c2pHSGRDRExJMlpjbjJRbThjRXoxR2hUUXh2WktSQ1JPWVRwK2NqR0UrTjU0UVlJSmQyajFHU00xR2ljeHp2SlpOdWdzU2NrSlNTTlZLZUI1b2lKYlpaRE9QQWFvaWtFa3lodUZRN201SFJia2RESkJ1bDduRWFZaVpKUzJoTzU1aERvOXcxb01kVXdpY01oWmlaeTJKSWYyeDBHY2drNlNWTkdzY29hS01GNC9GQlIwRVZDTnJnUXhRQTRCUjdEWmpndHVSU1RlRWpwM3lGMnZLandNWUZieVJoaXFqY2ZFOUJZbkVaV01TRkNUTDBhSkVUWFNjTXR0ck5KZ2lCRVZHWXZZVTdhckVWZGVJQ3hlOFJ1dnVEQTJ5eFVkY2NFY21uQ2lXK0NocXhvVXRDOU1JWkJJVERUYkcwMGptT2lpRmpaR3lGc0QyaHZzTmh2c05odm92U1puOUhNZ1pIMUZBZm5lUGY4QWhGVWZpRkNyRnkwSHNibWt6dHB6My9IRFdPOUZBaFBCMzdUZUNpSWFOWFVxTUc1QXJlSGFyR3JpM21nSWtjSk51U2U3U1NSZWVZYW9Yc3RuV2ZncVFlRHZxZ3psMlNoMEVOd3RLTnlpR2diQ0NoTGM2dkRFZUI4cUxhbTZJN0pTekZ2RkJESWtUdXl5MDNoQ2MyS3JYSm50ZEJ6VHZ0VmpHb1RXWWV5c01Pa3VFZEtkeVdoL0F1NmV3YlpSSGdHdDg4alEvRVlsbWtjeklVTTAyY0NZRUdGSHVZSmw0UWhNNlhpQ3R2Y0ZRcWdKRWxIa0lpcDdqQTZCcHYzclFNVTg1cUlFd0l4bEFTbzN2ZXdndWpzUld2d3lTOEtIczk4T0VpSmpXcHZzZVFWQk9HOGlrVzFUOXBFeWF3YS9PT1NSUVhZS2QyOEJXK1A1YUF1WWtveXBHbWhtQWJpRkhhMlZDTmI4QmV4Sk91UWttOHNUNExrSVo0bnNuQkdqbHZTaENjRmVRU05lRFlYdUxJVHl3Rk1WMkc4dHVCYmMyQkRRY2hXNFBDRDhNUGNLQzZTazNVT1c4bUV6WGNib0xxcFhjVzJwTVJhRzFZYkNlZEZyaUZHTkgrREhEZTJ1bEZlZEo0cVZXMkJWZHdvSVNibjJDUjZFazJiVk5rbTBGVEZsRWJURTFMSHJ6dTVTY1lSQ1Ewcmp0eEk5N05WRGR2cmtXa0ZvSitna3JYT3dTcGtXYXN4R2tSWlZRa3BtQUVrNkM3UUw4d0NZZXdQU3Fub3BHbllhSUc5ZGthK2JBL0krWEptQkJDQWlsT0t4eTZQaHREOFVkSDdDVTNIMkc4SG9wMkdNeFF1Vmx1a3lrbTZldzcrZy9vQTMra2F2MG53QXpmN0c2RzQreHVwdW85NlBkYU5zQzdZbWRrOUUxZFIyVDJIcE11QXhCVGVuWW5PRXg3Q2NGTjlEUWFHdlExVlZ0aVdtZTRZdWp1d3hsZGNVSVMxYXQyeFBuTzdnVTNoaFN2T2lDZksrQlA4QVRrcEpMTFpUbnFoVFV6MlFMWFFWbThtUHc0NHVvblVTNkhiQkhON1JIdEFUbHhGeEJjSEVIcG4zTkZJSGlBVlhSYm9IbG4zRGtHZTBGTVh1eSt0STV3NllXY1NHcHRlOUJ3Z1pVU3EwSVJzSU9LaDlna3BDbXlPOUdZY3JkeVNFT3VBSklkbXpDZURxRDQvdUxwU0xia1QwVGtNVFY3aElSVW15RVdyYWJ6SVROdHJpc2lWVk5XSTJoMmFFbExvOEVTWkJOeU1ZWVRaSTJ2M0VwT1c3N3RSRGxlZ0Vrb041NEpOZHRvVFVwYnhCaDN4VkNwOElxalpLUHVHYUhDUk4wRmtPbDdsOVc0UHdBZ2xzZHhiWW92dVEwbmtSaDd3bEVnMzRTaFZUTm9tVDJ3QkJuamxXU3BHM0o5a1V3OHBud0VzdnBDSFQ5Z2p3K05xQkxZTXlaL0pEMmh0TUc5Q1NyTWY0dHlhSk9xZXk0RkY0WkxCMkI2cjJ4UFJFbTR1YTVHdktGNFkzb1YwYkd2c0s4SDRMc1B0Q2JrS0dMVVRnVWw5NENrSDNJdThwQ2hoalNUejdvSVllOEpFbElSd3QyVkFvVUlzcFVhY3VXV1NFMkp0N0ExR202MG1LVlFXRVJnSWlXTmVTcjFrWnlScGlGM1BLRUo5Nm1RUTBvUzhQaGtjZmNGSkZVODBsYzZxeFRBbkNZMk9tRXJ2SzZNM055Q1Y0TUNWMDVRbU02Z0h5UnRzVmNXcFltTXhRVFZLZDZIVXgvUWVLSVFackQ3TFNXeW1JcTk0SlF1RnV3cExIZWtiV3V5UlJOeUhUdFVENjlxY24zWUNubGJ0QXFxUGVmakdhQkhnU3VmQ0xyRDdoNkdzQlZkSHdHQi9Vc2gyOGcxd0pVSG5aamg3RXE4bWtZL2FlcEpGS05sZ2VRMTVFRVY5eU9xc2NWeTJyS2Q3Y1A0K1FwL2NybzBXb2RpNFZlRThUQlEzenFqS2dMc0tvU0lrQUM5RHRVY1B1RFZjN01nVTZ1ZS9teVlhUEJncHZBMXFMa2NtbEh3T3dXRWt6Q0dUVGRiRGxxZnFEUGNZeUZtUHdPb2NUT3gya2drVWJ5Ti9pajI0em9VWTI0S09iZHFjQ2RzcHJDRFRySVBxU2QweVY5WmN4b2R3cUNvMktTb1dFemtTSUZDM3NRTHRVWE1temdVY0NXaFlEaXEzRktvVU43U2hNZkxKcFg0U0YwdmN6SXBFekdZMjBlWVlpbTdoQ0dSQVo1UHZRREtXckRrS1RrOHgvazgxS0g0RHlzcFpEa21UWUpGRUlQNjA4RlgwKzV0WkV3bEF3cDhoVXpnU2todzZTbzVkMUFPeGQ3c09qcHNDdlY5RnhHOTJiYXVrUzNKVlNkT0MwY1d6ZGpXNWR4V2U4aXlqc1kyZEljU3o1TFZ6eVJrSEZVZG9nRmlianhvaUozUmhCamRPV0hNRUFqbStaYkZ4QWhraHZURTZuSENHUUxhc3hOb1ZWREVyUVMyemFwQm8zdVhURmNyc1FDZUtTNUxHNFpzajNvUWVSZldHUGxVOG9ibVhZbjloOS9oRGVTVmFYdkJCWGdsK3ZTUm1YOXRIRkxlUndpWHVGN3VUYXBIL0F4R2Y4QWxvSkcwcXl3Q2VYTHdVTmpJbWFKd0dxWmU2UHg4RHVwRTJ4SmdQeWtRVEFLSWY1UkpCN0VUaHZ1Uzl3NXBkbGgzSzY5OXhiU1dKTkhsejJZa3FQSlUxcnlJS2lHZHZBK2NZeHZCUTVjOWlLaCt4SDhEQ1FRbnVJM3RkQ3o3MnAraGphUm0rWmtEKzdDcSt3V25wV2o1WkRhbURla0xMaG1HOHNSZFVSSmNDSW5DR2hTOU5pbnlic3JqakxYMlBYY21WUEIvQTRZQ3lQWVBHNGVCVjBNaWwrZUExdzhNQ2RyNVFMeUpRL3ZhaUhOVFlydFl6U1B0VDZHbjJnWGo0a0NuekJ3VlFma1BwN0RLWEc2WTdjNE5pUDNjSHpncTNTSXBVYmx4WkMrNUZwL0loMXZ1b05qZUJ2TlBnajFscGx0QXZ3M0tsZVJML2dIYzhrNGtqWXF3TkdtYzd5ZU5aUlhzOG02V3hGRVBsaXlmQ0lVTm9iTUpNbUd5cXhGMHJ4bTF6c2k2ckxMQ2t1MWR5VDdVeUREQ0xJNzdxUzE1RTJYRlVVMUJiMEVVMmx6b3lZdWhmbFJlWUVaL2lSaXBVRHJvRE9uWXJEQ21iSWdkTTdnSkpSZVFoV2U3a2J4dkI1UVpHU2x1VmsyYXM3SHV4Q0tNdnZMRXliOWtLeVBsb3JpbUdWeUpqTmZnZGVUd0U3c214MHVPUnE1aDlSd1VLMGs4VUdwdVpWSkZhLzZGTlVtN0pzNWhBbHlYMEtsRDdLbWJySTIreVIyNEV0TkVvUGEyaEJJOVN4RWIxZ0lJSGdKc3lMZUpCTHVKV1JHNGszRW00dVlwWkVqRWpKN3BDdVBZSC9BQTFwVEpINnhDN093N2dYOENCN0wvZUFVeEcyckZWUGNMS3VoaktrUFpRR2o3K2lHTWZ1T2c1TkRkRDV5b2RHVE54VlgxR1JQTWlhZFlOS1BBRHVSdkF2SWsrK0NxOXhMUTVUbGZaTVF5ODJrZTJ2b1BQdUdRSHVBbHJ6N0VrcVBkTWZRckhBcklOd25pQlBNSGxTTnd6d3haQktXYnl6Q0VZYkt1WFpscmhDTEVBM29zTzBrNkluSTlaRkpzTXFrRHdFeS9wSE9FSnVqRTFaa2VSdnVTdTdCbitFc2pRUk93WWRlbVEza1o1bnlQTDdaK05TTEwvSWJWMTJEVG1mTGV3dUpadkVvVHk4SDRRb1NEVDVraEdaN3JHbFJNbHcwTzRoc0xKYWJuRkk0TU5LVU15eTlOSXJEcytyVG80UTlnWXE2Uk1ZVHdKSmxTNEdqUXM4azJkVW9oUWhOc1ozSU1xSnhUZE1CT3NlU0lyUjZIY204NmpLcVJHR1ZzU2RhSHdJMjJRU0p5M2lCTXhUR1g0UVZvWDJFbWhkbW8rQmJZSXF4UitncDNEWmt4dUNaUkpyc2hOM1NMcVQzRjFEQ2VoQ3JKdGFNMTVCRjFOZXhDUExOMlBmS3JNS05vaHZldmZvTlhjdUlpNlhWNklwZFFmcHIzOUN4WDI5RDZvUDVWRk5UQXNKa3NpU2M3UkozWmtrdC93R2JONVJ1enBqZ3JMMEpJU3B5VStFRmNxU1lqa0RzRFFsNUZWSGJpbUJXcVNRY2VxRVB4QmFDYVZZUlYxWGtjdzFoY2tkY0dSeVB5RW1Ua09jNWpsRnpJYjZWZVJGeW5LY2h5aVhjNUJjaEk4a2R5SkVXQUxmUVZ3TE5FZGdnVWdicEdTSldqTCtDVjRHMDJOaDA3cUlxUDdrd1g4a0Z3ak1LbUFYd2ZoY0hmeGJLQklYWk14NjU5QzVPOFNVZ2dveWMya25YVHNld2owV1pXNWxxcG04a2tvSkdLZ1RCV0Z6RUxWbWRNY0xsVm9DN0NZbHhvRDZPeU50RDFFOTJUM25zYVpRYXhCSzMwZVNZSmJreEMxdmcrOHBvKzZaQ1dHZGVDRUZWZXpMOVR5TmFvZnRzejJONHVQZWt0UEpUQWxRTXV6S0pKMGdySWtUT2s2eVhFMWJWNkxMb2haWXY5Wi9DMGpNdmRxRElkeVJxRk5vSms5YXp2cEpJblFoWE1KTHErRVIyZnVCQ2NyNVJMVU5ya3hzVVNTNFB1TU1vOUFrVVpLYmFwUlRTUnExWTNObUpDUzlrVnhkQmN2RUhON2xpbFJiSVhHNU9JU0Ywa1B2c1Q4eFJseEc3eWxDUWhReE9GcFpQR2pVMkVGMXZJbWxYS0MyaXc5eGdRbHZkQ3FBVlhOeEdMd1FMdVM0SCtneDNUZGt6ZXZaQTZ1MGNLTUNDNGVRWGEzRlZhb2hLZ1JrdW9NaWY0UW9pZ1NFdzk2RnlIT0ozRW00bDNGeU9VNVRsT1E1RGxFbTVIY2E3aU1NZ3lQekk4bVl5L1VNY2h0b1dxaFRFSmFJbkVpNFJpRUYwTjFsWTk5d0tiNkJJeXJSVGtSZnJBMW9GdFM3SWhjdVJhOUEyU1Q5QVhka3lYQWhITXRKVmtjRU1JMWNqWEtoMkZ5R0VzY0JSeVFFc01UWWduc1JER01UMlI3alE0RzJTTmpaSk9sTnpwbFNSbmtrdFh5TkYweG9nalJxMkRUTFJ1dVRva0p1eHZjNDdJMGpTU1dTU1NUckoyT2JLTnlLc2h1TmlSTGQvcVhJaldmUkhvZ2xzUnJHa0Rub01ZSHVPcVE3RjVjd2o0RnNQMkxtdkJscUc3cnVaZ0xvUWNOYmdReFJUU0JqZGFzUzFCOWxCVWRhamFhc1NkaTRVUTdHckhOMmlQUkpJcWF5RzhDUSt0QlpRbHNyb0picTdLaVg1NkRadUNCU3JDYWRoa2NSMGd4ekxrWnoyakxWMldSV2M0bGt6eGlNYXJPa3BpWEpLSndoQklVRWl5UldxSWNrT1NPUTdzV3dPd3hTNlpEaU1BV1VvM0M3eGJRMVdFK0kxYWh0TVNuY3RURGRCS0lGOGFDV2hlMlB2NENiMkdHN0dGVldwQ2tMa1dkQk5wYkdiakZrbVZ5dmNZN2FHV1hwSmhURXl3M2tocFBqUlpXL2NnMUhRWXgyb1NPMlkvT1hjbllrbldkRWpvRitrWTlyOXhmVzl5cjNaM0JUY2ZCUG9naldDQ1doR0kwZ2VrRUVlaU5ZSUlJMWc1ZXBCR2psNkE1Nm5ndmdvVEF4NG9WZ1prZ2pCM2hWZmNnaFZYaUJuK1FMV1Y1a2RqVjBNV0VjMVQ1TVRFSUpSY2lXUjB1QzBTK1IxT2JnZ3VuU2RZSUlJSUkwcmloQ3JBaUxVU202Y0ZjYzdCS2gxaUtlV1JBNFJydEVyRWxjUFIyaW5LTGtDZTQzQ2J2Sko1SmhtUmtoSXlabzVSSnlad1dSalprNVdMZEU2N0h1REdJY2hYSXltS1Z4MkJENHcyQVdyQ2VHUVdiSHVzWnUyTWVkRlFpU2U3Sko5VlVWcWtZeHowTzNwQitqbERKUGRuZlRYY2JReDZNWkU2eXlTUlZ5QmxVbDRFU050WktFYk1iTzdGL3h2L29XazZxaUpJa2lOREkwS0RYa1dwZ29VRzdHa3RKVU9JT0lGRFo5aWpwQ2s1Sjg2SVRsd0pCTlNkWjBld3NEVU1qMW9mcFk5SmFkQjRsRTJkVHpmQzFzQ2toYXRDQ3hPa2FUQWdtU1RyT3NraVJJaEVrSjl4Ymd4M2VrQkprazZyUkNKSkpKMVZkSjlLUnNra2tra2tra2JKSkU2SjBTSkdQUzRSU1AwTFJrNlI2UC85b0FEQU1CQUFJQUF3QUFBQkFSVU01Y0V3SGhqOW5EOFRqL0FQdzBTbFlrUDcveEE4Kzl5R3l0dVhzenFyNHE5MElLV09SOWhWT3BLUnoxT0JLTmM1cGJPSkpKdmpGYTI5OGVWcnU2aVhQNkVXRjRIeVNnN0FlNEFIUUI3czZ6TEZ1Q1E5SnFhVnN1bjdvY3ZvaDBkYmkvWitJRjN5NVhsYlAzZk90NU9ubCtIWDJNZjhNdFJOUC9BTWh5RTYya1htenIyaEs3U0ErUTFPWmYvZUZkKzZqR0pPWDNFV0d5Y0k0eVJzdkZNQzlWMjdPY0JHa0U2aGhRSTBzTzQ4d1NjZzFuOVBucWthQmFsa1JlcnFIUDJISE1TUlFuRmlKcFIwbXo5VVJrbU5xdHZsc0V3SXdKbWNQcHZOT3VGVUIvbzRqM3ZUVlROQko0MHp4aUIxZVNLN1BDdHNSQTlIbWNPcEU2MGVEOE9rUWpuYmlhVlR4Qzg3c1pkNHlEMlFhUzlaQ01veGRyY2EwdWdJNUR1Z1FCSjYzK2Z3ZytZTExNa3h0UjE3d1BhbEd3dGl0SlhlQ1N0WWt2RUV1eXNqS2d2Qk1CMFB0bko4U3FJZkR1VzI1dFQvNEpObHNDU0pKTVlEUVlzc1h3dkJXbU0rTTJEYUwxL0JFSHd6aGtWS2ZqekdkSXFWV0szRDA2UHNJQ2t3dWUyVGZLaXh3OFJ0ZkwyOFFENndmeW5vc1NDd1NjanpRMnh4L3pDdk9aaXlMWmtKa1dlVTR6SXJiYU9JcDhxNCtIQlh6eFFhWTdKc1lHN05nWnd2dUxRVTJYRGhJOTQrc3VzaUR5M3MzWEJRYmoyeXhxT3N5L3dUYkN5ZXhzTm9xQ05iWWwwVlNDK3ZPK0ZYQzk4OUpOVHNsV2lwRHhpSS9FcXJSZzRKOVMxT29xMHBMMVJZSnp3OUFDd3pMYWJOWWwrRkRRUUpyTk82RklVWEZ4UytxRW54bzJvVkoxWDRzUTVIeGlCcDZTSUw5bkZXdXJaRUZ3K3gyT2hLM1hZUGljSVBvNmI5TnJ0cGwrbzg3ZytCNHUwOFlwYmtJdmk0U0lIUHRlWVZOKzFYbDZ1Y216L1N0OEEvOEFtOFViZHpXaU1NcVRwaUI1Y2FLcEVxYzZzOE1CQWVEdHRyUC9BT2tROEszQWtzREdSMXZlUkdFTFRuNFNYZUtEYUdEVWdIcVp1RlYrNndvQkZBVUlaOHFZdGlXMzViRFVwQU1KcG1zTTJIdW1QeWpIZzNpOVozOU5mQk1iNGFsYmZpNUZ0YkZqbElYVHhBNkxRaDdROU52QVhIQTlMQ0FGRVIxU1orZXc4b3dvZjJYYjFWenZQQTV0NnFlUG05aWtDTE01NFVZaEtPTkIwVEQ2MHdvQzN6UWJ5VE44eW9BL2UyUHdHMVRiRng2YlU0bFB5U3lqWkVDbzEyb2E3TVpINXFuL0FNeW5FTk0wYTB1ZDlxZ0hQSHdTeHpablk2ZzB5ZVlSbEQvS1RkZnlWWHkzeVNRU1IzWWJEZGc5cHBNcTM5SU03QmJ1TUFLS0FReGRSektMc2tWYUdaSjVodHVqMWt3NmJFVWxabzJPUkE5UU9YKzlHTWhCMGxPMXhteGlja3RnR2hJKzJXamNKc2QwOW8vT3lVVjhZcEQ1Qlc4SG03bGhPMWgvbTRNRFIya3lpRjBORTlIM25jZHh6MzRxR3FzRjh6QWc4Q0NHNjZ5WVp3M0V6eTFpZzZaTFEyZms3cnp2K3ZSaUI4NkVGWjE1b0V5eVlnMXVQVWJQQ3ZBQ0h1MzhkTDFZaXBNRTZiOVNsZldRQlZtZkJGSG11NDk0V0RBWTA5T1M0YUhMZ05tZ1ZKYWNpRTNuSmxzN0tjVWlPRXhIVE8vbFkxaUxtSGJuUTRsV2VxM0ZFa1pZT04vQVNhWGZNa3dOUVRYRlBnd29vSTRvM3cvSVFZZlBYd2ZBMzNnM29IWGZvNFBIb1hnWFlYUS9QSG9QZjM0NHZQdlgvd0FINTZEOTZGMkw5OEtNTDBONlA1MStNTCtEMENGMzE3NkIwTUozMTZOejZJSC94QUFvRVFFQUFnRUNCUVVBQXdFQkFBQUFBQUFCQUJFaE1VRVFVV0dCa1hHaHNjSFJJT0h3OFRELzJnQUlBUU1CQVQ4UTZpZFpPc25YblhuWG5YWWN5ZFdkV2RSbDg4SG5ZZGN2bmgxdzY1WFBLNTVYUERtUTUwSHpnK2NGQ1NDUVFIS1U0UnlwMHBYbEtjcFRsS2NvY3FIS2h5b2N1ZE9kT0hMblFRNUNkQ2RFblNUcGNGMFpSdE9tUjVDUEpuUW5RanlwMDUwcDBwMEowSjBKMHAwcFhsS2NvY2lkQ2RDZENkS2RDZENVNVNuS0lOb25sRVI0ZDRLRG9SNWlkSDQvdUQ1TjZVZnNYODR6RUlkYWpPb2VoQjFsZTFUTzBla2FCWlhadXhEaEVIQ09FTGdPbVhnb1NTUWNlUVFTU1FRUVNjSWdna2tnRVA0RVFTVFgrRXIvQUJDbjgrTDhEeGJ3bGNvOU05TU9PdC80Y1Zta3RNa2oyaVZLOW1QQW85UmpJZkNmckczM2txTlBpWE5NMWtUVGQ5b1lsMUNiWjcxTmtoT2JJRlFtZ0RIc3gzZzRRUUNCemxadUp5NERhWFlsdExRNG9jSkpKSkhCd2NKdkNUcGhCQkpKd2hKSndod2trL2c1Si9BcmNONWVYbHBva0ZXcE9qR2RFd2pkN3hWam4vSWxta0M2U3VCdGFJSHJEYTRQajE5b2p2N1JOaWFRWEVtc281VkRzdjNLbUFpNWVQYUxZTTJSNG1vU1BCZWxjYm9sdWhETDJtR0svTXpHY0VvZTAwSkVNTklwYnZlTnRXV2J5cmxwcSsrZ3djRkNEaEVra0VDZzRRRGdKSkpJSkpKRENDU1F3bGdnZ2dra2svZ0JCd0NTUlFnL20zcEFRSmZTQ0NwNkNETVVTamFaYlJHcTR1b1dOdDh1WVVvME1IcUp1a2ljWHdBYlNYWXdORmNSVVpDQzJnR0xqZGVCVysxSEJGTUFzSWdLT1ZReXhBMlVpMnFuS1EwRWF2aHVNc0JnN1RIUDFOUFlnMUFlNzd1R2ZHaGZMQUtielh4RGlEZ0VFRUVFRUVFRUVraGdPRzhGT2tHdFpndUVrNGc0WkpKSi9ISkpKSkpKSkIvSUEvOEFBQUlIQk1XYlJSdW0wYzA4cnpGT0ljeE5xL0VHcGJqbU0zVDhRdzRQMVBlRFROSWlha0hsSHJZTnpuL2RwV3BxWXJCTmsyOThUWHZhVFhZV3N4V2FwcFFzenlCRmxVaE9yakphMXVPd1ljcUhoSkpCSklvUmFFRUhGa0Y1WkpRYnN0OHZudC9jVjFqa2xIdEVqcU85eThvOW45ek91L0VaZ2RBNGd0cytrWGF1UldUM3pNTVE2TlZOSW5sREc0elNFRUVuREpKRHdrbkRPQVFRTGdQL0FCODd4N0Zway9na1dXaEJ6SXJBbWRTTDNlMzVCUHVnZWk5bzdpOEVTMyszNUI3cUNOM3QrVE8wTkptQ2JvaUZBdnRHSDJ4RFFQZjltWlJmUzVyZzZWK3cycWZYK3BycXFhbXNYakY1Y2VSRWRJbUk2Y1FkdXBDNEIxZ1lqUWh5SWphRGFFUnBMbGVZQys4ZnlOMDNtdVpzc2RRWnljNWFIdEtjRGNKWll3MVJMUzRFVVhxTUQrQmVHcFFzbnIra3lmNWhtTTBKdGVHTDR1MGVyTDZTOHV2MGxiY1JKSzhCQkZKU1ZpaGJGbGpGYU81YjJPZWt3b090cjlRRzY5WDRnVnczSEFDeVhNUUNVU2lVU2twS1JFQTZRQmRQaWFXdkRIMXJ3L2tHdWoxRStvdlFNUTd6MFBNTHVCNUpUaExSY2RwTEJsZ3YrUUs0K0piazhHYXpWUUZpMFRrLzkyaG1qQktvaU4yeFRpQTlFbXVpTy9VTVZiTlhSQlRSZ01rVW9oSEpMWExNWDVuT0lROEtsWVZnMUFOMkc3d05zVnlPVEovSmVCenQyTml4ZXN3Y3hiYXFVcktDWGtETEFpdzh4SnN5NWJGTldVU0E3UnZFdW1YUlNlVEFES1c0OUpzZE9Wdjl6RWVIOVF1dmFQdnJNNEZhanJGN2hCL2FIN0xSM1Vkb3I5YStaWlRaNmsxb2VTYkpmVFB4RU5memRQRTFkbkl3ZTB1K3JsYk1vMFJWbzBjNWF0V3gydFpoMCsrMEJZVjV0LzczaTR0THNYZjNLZlBUZkJ0R1lMOHltSWRaalpVRzJzcm1nWmluYUc1N0kzZC9qNGpWUklyQllya1VDMUQ2TTBhbmMvWlZDOHl4QThvZmtIMEZuKzAvTEIxaFR6ckJxVzdmMWp4WGRwOVF5aCtDWFNESmRMeThVaHpKV29wREdyNmhGTGZBSlJ2S3hEdkE1eGVjVWJ6clFZeEtMMU1HV0R6TlRIbUpVV2hhbnlSYXhtWU15QWdPcEJid0ppRmxKZ0Y5MC9rc0lYMmxyb2VzV3duMXpGYVY3MGVDQ05vc013eVFUdENaNjJpdjFyRGFYcGMrR3BSV0RwOXdHTDY3VHBla3ltSG13ZlRTWkJ3OVQzSDZoN2NQVEh6QmZqWDhSS21uck16TEhiWmwyUVdFdVlkeENrd3dSS2xDNHRTbzdvaUFkenRFN3lnR0NMWnJ0SElBS3FabFNpMkpvTHFaUTRtSUcvU0swVDFtZHZFcjl0cmRLYmVYUkUrWlNmZlVHenRCbEwwTzhQMVBmOW0vODM3Q0ZYb3o3UDdFcldCM3JIekRzbzdmc0QvNGh2SEI1QkxYQTh3SXlSNU1OMGpQcHprOEpVVHJjT3paQnY2ZjNOMG54TExZdmI4aWVuei9BRkFUWjNsajNseHloRHArbWMzc0ErbUhWWjMvQUNvdm9wM1lzS3Q1amRlWDFZNkJLRzRqb1RuSnFER09aU29ZeldNZWpIbFM3YVg3UWVVZXdnZXQ5US9JZFMvSHhFMUxIcXhnUFFnRzRIU05PckVmRUppb01kY1BpTlkrUllPemtnOXN3NHIzaDlDN0VjSHFid2xGZmxsOFJqMTBmcERFTGFwaDhrU05VTEI1L0VveHJac3J6TWRWekt4NGRqRDdsamErb2ZxRCtxV0Q4MTdUTkN2VU9sazhrQVdlMHdGVkhhMW1qVFExUXhiQzdXRml5RGN3ekpwQlFHMVVRYXN6U1pPMEt3MnhuRFJLL2xEd1VhNHZHY3kyQkJzR1BNVkdHeXl5Ym9xcURvRTNWczlHTTJJT3ptdUhFcTVoV0pUVFZuWTlPa3lwR3ROcjA1Um00cllkTzB3ZDYxSHVFS2pEMEQ4aEJOZUVQM0hNcnNmYkNnSzNhcjJZVGVjT1REbHdtVEs3UURhSExod2FwR3NldUk1eE1yemlEVmh6NXowUnZCZDRGblFqYmFPK3hRMWkrODVxUE1qdXBBYklmODBlQ1NwTmpFTFlQcERhc3U0V0FUSno0TmRZdmFXWVZRSFJTTjE4ait5cDlqK3pJMnlpWmladWNOejJMTklFTEtyYVExc0lIbnpCZmdqUUYxT2U0WWZFeHM2L29kWTZVdmxmc09HS2FSOG1QY2ppa04vb2FsNWJMbFFnb2lqTDdTaFRiRTFtRVhtRjJrR0swaDF5bURzbVlLOVNlNURGSi96VzVadTZCUEpjSlFqbWlYSS9SVXcvNjFETVdOTXZDNWcwRWVWRmFySTlvUE1EWFoyakZlUWxEcmN0TGdFeWtzMTBqazBzRTNsSXpuVk5Ndmt1NVpUenFSaXFQa2Z1R0FWNGdvS2d3YXd3Q3g4eWtHL1dLYVJ6Y2ZjOHNXL294U1lMdWxINy93QlIyMGVxK29IUU83OW00bnFvelE5MzdDYVgvanJLT1A4QUYxaXRqUDhBamVMMXYvSFdIMFgvQUIxbExmeS9zTGJyOHdXZzhRT2hPbERrUWpHVmlrUWQ0bVVpT3NRMGxaWjBsdWN6aVRKdVhNM0NnaXFaUTVvRFFnaHE4TlhNMTRtVGJNbTZnU1g2SnVHWEpTVUV2RDE4RmVTSlVlalkrOVB2QktGNGV6U0w4TmgvWHRNd2h6Qy9kOGtvbTdrVCtQdEN4VGM1K1Q3bWRkT3V2c21jUDBGZThybnJrTUJ3dlZma3F3bFEySWZCckM0YkVDa1l0b3JHQ0hYa2RKWnhqMHhFU2pMOFhBRFpIckk2cEg2eEl1N2pmdUttUGFSM2ZKR0tldS9yU0RZdUVYbEs3c2Z0MDg0VHI2aFh1VXhVcGI1SG5YekFFQytZMCtJMlM4VDVtSTdETkkxSWFSaWxxa2FxRzc4YlE2NzNKLzFTcUJKVzBwTlVlU2ZVdTBLZjV5aWVQdyt3akZxZE1rMkZkQy9pNXFwK3I4bWNxZW4xTUNkMHI3Z21nZHZwQTlCSHFScWg4eXRCZnFIekNMcWQvd0F1Y3M0YUkxSnFQMlZid0JyOXo5bFd3NlpudlVLVWJUTlc4a0dzdjZaaUdJTlpqYWVFRkJaY3N0M0FJVjFqZGpuU1lOeEljOHhvZ3JyQURCeFNTTzBsMllVWmp5U3FHNUJhWEtNcHlHT3VIdk5kRHV4eEZ2ZGp0b1M3YytyRHJjNnI5aW1yY3RNSnJTUDdqcktIMnk3ZkVhRW1teHBjdzNmbERhQjNMK1pyUjdGZkVSc3M3d1F4NXY2aWRYMmkxOWNWcVBFczBQdkc1VjlHYXk3MUlUUXJvelhDK0xoRi9CaU5WR2FLVkxjQ1lvaTFPOGVjZWpLRjJsK3JlSUJ0aHIxZVpwTGRoZ0xidkJOVVQ2djRFSmdQOTZ3dGdRamFJV2tCbXNRZVFtSzBabEZjMGdNZXgyaUxicmZWSlRwY2RUOGpRUHFQNHFBV005UCtvbzl0L1NDNXIxTFBKZnhHd0k5YStZbkJkb3lmellvdGd6bTNhWW90ZzJBR1hnZjRCV1VpRXR2S2x0aVg2NG5ObE1xVmNRQ05PaEY0UURlRDV3Z3BFSjZjTXhVWmRRV0RkRWVVWllhWmdyV0s2Qk1YRXNhbUdBT1kzU3JwRllOeEF0WjBvSHFUUG1ZY01UbkU1eG5lQTNodDV6MFkzblhpZmROcElBNGh1a1ZwV0p6RFNJdDNZMXl6dkJxRjNndUxSTm5GSWUwb2ZGS1dDbU1ZNXBPOGMxY0p3ZURqakxHTU0xMU5QWnprQnZ3SE9UbVk4VkZaYVlCVHZLYzM4eEdGd09DWmhad1hMNFdSSEFGd2hnbDhMSmN2aGN1RXVXUm9RbXJMbWRvTmJ5bThvOE0zQlRPU0JNUXJwTE5ZWlZ3RGhaSGdLN1NvR2hCV1o1d0NCUmlEWGdBeU5Ca3Vtd1puQUdzZVJtd1liOFVpUm9qQjZzSG96bVFjMmMxd1F6ZHpWRVV6bUl0dkU1enFRTHdnR05FSWpIaTF4Y1dYRCtMQ1BBaERnL3dQNE1ZY1pIZ1l3NEdzMVFqR0g4TC9BQUlUUnhIVGlIZ3hnaE5vY0hqcWh3SWNCQ0hCb2xzVVRVVExZckxaY0ZpYmxzWEhBeGpIK1A4QS84UUFLQkVCQUFJQkFnVUVBd0VCQVFBQUFBQUFBUUFSSVRGQkVGRmhjWkdCb2NIUklMSGhNUER4LzlvQUNBRUNBUUUvRU9pblFUb0owU2RPZEtkTW5UblRuVG5UblRuVG5SSjBaMFowWThtZEdWeXl1V2RrN0pqbEhvbE9VVEtTbitSL3R6bHBhSzV5L09YNXpxVHJUcnpxenF6cVRxVHFUcVRxUTUwNmtGemwrY0h6bHVjRitiOStHLzRDL0h2TGNRNFFaV1U0RFdYTVQxUG4rUnFnVHJiOVFEeGhNbzE2UVNJcnV6TXZuRWF0Z05JTWV0ZkxIZ01YeEtmNS93QVBIc3ZEWlpaZUU4QmhobC9KOWwvSHIvaUFEL0FjcHhhZmhhOEorYWF1OEROU1ZBN0FPNUhpRjdKREtGZTc5RTF2aVlocmxwcHdXc3BvN3pTRkduRTk0NnM4QVo1VG1DRTBIamhlUFEybDR2YmlFdzUwci9qL0FLWThCaWtlRFdWaVpXSWpMK1E3L3FCd3B3MGdDNXExVktXaytaZnF2Yk1lekhvZjJZVnZhVi90SFFCRU5SRVA1WTZDV2Y4QXVFNXdsMmtOM3kveUQwRC9BTTZUVUY1SlpaaVpSb1ExU2VvZkVRMFdOSmJ3bCtYMmh0VDFTSi82aUxVWHRGcU0wOVV5MGw2aTJIV01Pc1FrdXQ3dytvWWxaUUNoUFNGTnAwSWdhWWN5YUpuZE9CaXNaZndwbDREeHp3Ri9oV1hnc3FsK0czK0xzOEovSDd3SDhRVzRiUjRGRTV3aUd3aGhCSGFsdWtiQ0ZXMk5sS2JrVk5JTEU5NXptSWJ5OXJITllCeXdwMWg2R0Njd3ZSWUJod0xoNVpic2h0VXdpb1ZOaE5aRHlLaFJFdTlsKzBLeWl4MmpCN3luZVZRT2xPU1NrMVVCMkhZWCs1UjRPMEhsZHpYNkttbHowTDh2NDJ5OFk4YzhleXkvZ0hMRUE4dExnR01QK1FUUEZNTU1QQ1plQXcvNm1BV0dRYXNPUlYxSHBOWnRnMkl2b1I1RXAxaEpsMEl0MGh5Wlh2RXFnS2puRVdzS0JXciswTDErNlNsaEMreWZmRE5KSURSTENUMVExZlNFSlYyc0lsREhFdEY4RUlHdThYSDhIWlplRThObDRUREFnQzFsQmhjdC93Q1MrNDVqbjN4QlgxU2l2R3NMcnpYZitUQkFkWllLTkNLejBtZVkyR1QxZ1pLZGtTM3JXT3pFMWdhbXNTcWQ0MHcvZzNpM2dQQXR3djRlOEpoaC9QeWNNazRkSll5aVZIUm5UaEN1U0xha2VYTWwwZ2VrS2RaZDNRRmFweUZBTjg2djJsSFZlWU0wVXpxOHpaSHBOYXE1dUNBWUQzaEg0WTZoZTMxRzVhNzFLOVU3UzNiUUZSelRvQTRSQTUwT0FFYXNGZ2kya0tJQ2J6TUUzbE9jVHppVzhBc3AyanRMNkh6S2JBN1RBYSttSUJ1ODd6NWx0TVE0SUxWU2tFMW9qcHhON1lpYXgybXBFMlNvTWRzZmhqN3kybzZmVURjTm1LYVBYYVBWRXBsSHdMd0g4UUs0SXE2aFlzbi9BSE9VUUxsckFNeTlLRDVtb05kajl5MG1IUjV4RHJDOHRMeTh0RGduRzBJbnF4RFhnQnpvcFhCRG56clRxVHF6cVRyUlBWaU84UnlRSXV2ZUpGNDh3amJ6TktEektEQk05eDBxTzNsN1RFS3BtMi9yTkNJZ09vazV0eHcxWnNvZTNJMHlNUWRDYTRSR3NKVUE2RXBmdEYzbDh2TDg1MW84eU0yMHJnTUtZWmRaemNFUXRGeTIvc0FGR0lwTVFRYXkxNGNBU3JJaFI5amNWMVl6MFVTMTVpOXg2cXpNWEJ5Uy93QnpLQ3VpbnRFRks4ejRlR0kwc09wajl4TEJYTE5lR1dSb2FKOVJBaEZpMFFIZFlSS1R5aGwxTzEvcTRuZlJ6cG1zdmhpMkg2NC9jWFF6a1pmTTAxdk55K1dVWVh6b2pDaGJBRnUzbEVXQlJNdFpqN2JjejFtRmRKUis0bEJCdTFYeEx4KzVUK3dTQTlqWjRabEg2aTAwbFI0dTNQaHhjb2NUc29wblFsMEJiZ09zTGF4TjAyRUY4c1FNa1NsTUpKMFJUZUtUTE1ta2VaRTBVbE8rQXRWQ0c3RU0xbGZNTnRCZHBsMGwya3F4Y3RaUVM2ZkViWU45cG9TaDF0STdoL1VLc3kxNGphc1YwWWphR0NtTmswMzBUN2xTQktJVmhCaWRtb0xaSHUrV1llMEx1SlNSQVJjeWc4bjkwbDcxZHJQYTVkd0hmNGljTm5lZGVjVTFoekxzNzZ6Yk5lbFBZVjd3ajNoWThseFRLOWFmZUJXTndxMlNqRENwcXJxWk1sdDVJb2tOck1NQ2J1RWFoR3V4QnRhN1FYeXNWWmJtMmphMnh0NWxLcWN0Y0VzR1prWEhlWEtSWWxrbDFUa2JRazRPVmlQekxnT1ZTbUxvMXFOdlNXUXNkYS9kUzNOZnFmVVozeHNQaytwVHdvMjM4UVZpbVZ5UVhhQ2JjYlJyRHNleVg1SU5jbUc0b0ZxcFVmMldwUWYyYnBIZk1wM2tqREtXTUpLV1U1RkZaRWRaclpUNnhjMWZNVnU4d0RhcjNaUndJdUNpWHJlSEsyRURGRnBBNlFtUjZrcTNsVzhvbDhHTTVZdGd3clNVUUVYZk5wR3ExaVhnbW1YZWhBV2R6TW5xek5VNWdMNm1HRzRiVjFscndLcE0ranRFSjllYlI1M2hZWWJCOG5NY3MwMDNQRERkcE5HaDhKOHdHa0x0U0oxUG1IQXFiQUoyU0hsQWM4dnNIN2x6cE9nMys2bVBjOUNQMFB2RnB3Yjd2UitHTVVGOG5EN3didktyMG1vRUFMVXdCTWVrdzFqVXpLaVJEQzVlYUJIRjRZdGtxYW1Xd21URXB6ajB5SHJpQ1ZsNzM4YXhXS2x1U3VKNXIxalhRellxdlVnd0VVNVFqRVFLSWl6bVg1N2NPejBJSlZEVEZEdU5YQnFsTjYxaDYxOU0reXpPcDZvL1RISThwUGlKc043dndRd3N1MmZraUZCSjFZdm5MODR2bkZjNG5PUFhIcjRIWGk4NHdaSmF4cHZFYzREbkQ1d1hlYzlPdEw5NDhFbTlUenhxT2JPZWxPckxkTDhNMUNkT1dxUmlqbFFJaXVzc1lKUTBpMW1tV1NsMGxKcE0wYTlRbTFQZ2ltNnZvVEJpQWNGZGdqYVVwUnpHbWtGQlZGSTRVTHFIejhRaGRIZHIwWEo1bWNudjloTWtUMnVkZTRaUFVnYVUyM0I5dFlvcXRza3dvSXNMV1NBR0QzakxjNWpBTkNGVWFNd0k5WjJRUmpaYkNLbmhmN2pOYjhySGdxWnB1NUh5bG9TNUlQblNlQUtXUjIzM2lTNEtXUmF1cFJNc0dBb21nd1BVaWJTTmwxOVpldTJOeDZOSTcxQkJReWpneXg5QWNockJLRGhiWnZVUXNNWFFZUFVhTUQvUUQzcGxtTjdpZmNWQzA1aDl0ZmFPMFgvamxGclY3dnFZZVBhL1libVZJOG1LN3hiZUNONHF1cmkzWjQvc05vUFErUmhHOFBkdmlPMmwwaUEzNTNoK2pJNndRQlV2WStDQ3Q0MXUzelArNnprRUxvSlhzUzNhVWFCd1F0SUY0UVlTUm5pRm9rampTRnVrSXc2eHloTnVxWDJJdWE2RVRiRGNoRm9ZbGplQ25PZ3VrSXhPRmpEK0UxUERIcnM4cjJzOW9wc0Q0ZmN0Q0t1T21mM24zamNFT1JzLzUwWlFjam1uKy91S3dISjVlRmpGQmV1dnd6SCtGK0lwVFoxSnB1K3BCTTNPcnc0WFdJNnNMdFkzeTFlV0lVem5Udm1BTmlWWm1Db1pUQ2VrWHRCV0JpQzZQMHVMQTNjMkh1SXdRZG9sKytzcHlFWmJKcTZRL0d6bEhRYk90bmhzalU2YmZUU0IwbllXZVNWaDMwejRha0wzUWdHelB4R25KRFEzUlVNN0tEWHpIbFVPYnM4c3dzMW01VWZNWllIb3MwMXZNTXNCN1g4ejdTZkVHTFJ6L3BLNHVkVkhocjl5Njk5VDkzS1BvZzJlYVlGc3V4alVoNCtwck1kdnFBL2MrcDVaRlRZaDNZUmpPd3YxS2luME54dXdlOVB2OXdOci9wNnhXcFBSOFhHc0oyRitDSXFqdnFWOHpVbllIelVEaG9IaWxlOVFoQ0FsbS9BVVpSS0lnMmphUEpCaFlwS2hVWHJFSXRJRHJNYlNobHNyZXNvZ0tWREdHWFRTUkM5SmFjakRUQVRWZzhUb3ZFRW9tVkkxMm1COEFsQW94S2FsbU9zblQ0cmFHcEN0bUpycU9ZN0VibFRSM0FxYWZTQmNqeEFOUkVNRXRINWdHcTlvZHd4MUliSGptbFBrbGFzZWFtaG52QnJ1YmdTNjRSRzJTY2llazBWWnJLdzdVS2NMbExJOVlDeFBMTk5yMkQ1Wm1IOC9STjRXY2dSVEpOa1NwbklVblNtYWhDRzBrKzhBMWI2REJ0cDhNc1dXZG43dUpTNDkvcUlObC96dk5CSFpqOXdkVDRML0FGTmVQS1lBOXBBV1NXYVY5WVo1aWtvMGk3TzZDZ3AxOE4rQWxsTkNHWlp1eXVjaVdTNWJFbXBZMVlRTlViN1JVV3kzNEdUTTFpb2l1c09kaHVNUVFDc3pOYXdaTFhKRkRFTEVPYUFFN0k4cUNTNlVkNER0QTVSNVU1S0E3UlcwNUNBN1RveTdpYmpGWEpPUWhIUEFWKzBPUVRaaUliWVZjTzN0UFdXdjNRRHU5SlEwSVRkZWVKdlZLckpBMlNHc0VTYVRSWmlFaFEyQkI1UWtFSkRLUlhVY0FRS2JURXNJdHlwWEdtQ2hGMUZZM0tqTFBHcmhVcVZLbHJ3M09DczVsRGlwM3dwQWlLTlVyR1hYS0drWHJ3dVd3V0Z3dVlnODBvUmtacEI3a3UxSlhEMnhhV2NBelRDQVRTQVlIY2xzYmNTcEFFUXdHSTFJN1JFOG9tUEpocFZSeWFnaHBMb0UyZ0pUbHdKQXFDQTRBY1FJU29FZndPRHhmOVQ4UndFTmVER0VadHdKcDRrZndmOEFBRU9EQ01Qd1p0d1k4V01lS0Z3Y2Q0UUluQS9BY0RnY1AvL0VBQ1lRQVFBQ0FRUUNBZ0lEQVFFQUFBQUFBQUVBRVNFeFFWRmhjWUdSb1JEd3NjSFI0ZkgvMmdBSUFRRUFBVDhRL1N2N2hvUDFPNStnZjNML0FOejdoK3NmekRiL0FHTzRmdEg4eEd2aC93Q2tIMmYwNWxYNm4zSDlvL21ZUDNQbUt1ZjF1NWYvQUZ2bUJmc2ZjdU0vdWR3WDlEN2x1djduY1VkVDlPWlp0L1M3aHkzN2N3M3YxTzRiWDZIY3QvVSs0YjM2M2M0WC9UbUg2eC9NTGMvb2R6OWcvdUg2Qi9NdS9RKzUrZ2YzK0FGMm42SGNzMS9RN2wzN1gzUDA3KzViK2w5d1Q5RDdtNy9RN2h1UDlPWWpYOXp1Q2FmcWR3L1JQNWd1djZuYzJQNkhjczEvWTduN3gvYzNQN0hjRi9jKzRmcjM4eXpYOXJ1Y1A3WGNUL2ErNSs1ZjNMTmYzdTUzL3dDbk01djFPNGZvSDh5M1g1SCt5M1g0WC9ZZjhCLzJEZjRQK3cvNXYrb0gvbS83QVA4QUQvVU52OWp1QWFmb2R3VExlbi9aL3dDQi9xRC9BT0QvQUxCZjgzL1lmOEovMkJmNVArei9BTXIvQUZBdjh2OEFVL1ZQN25VZXY5Ui95RC9zQS9zUDlRMmZpLzFQL01mOW01OVArb04rcDl3RFg5anVaTDlEekNxZmcvMUxXL29mOWxPbncvNm4vaHYreXIvUC9Vci9BTVA5VC9pZjlRM2YwTzRycjhIK3AzbjZjeGI5ajdoL3d2OEFVL2JQN2orK2Z6UCtJLzFQMGgvTVEvWSs0bCtwOXloeCtoM1AxNys0L3FIOHgvY1A1aXIreDh3L1dQNWx2N0gzS3RQME81KzhmM0g5WS9tSmZwZmNwL2UrNSt2ZjNLUDN2dWZyWDl5bjlyN2lXbjdYY2YyTCtaeGZxZHhOL1MrWTdhL3R6SDkyL21mcTM5eEg5VDduRCtwM0ZzdjZIYy9RdjduNnAvY3UxL1M3bHY2WDNGUDJ2dWZzMzl3L2F2NWgrbGZ6RDlLL21mclg5ekQrMTh4L1JuM0hlL2M3bFQrNTh6OWMvdWNQN25jcTJmMDVpZjduM1Axeis1K25mM0hhL2U3bjZOL2NkdjhBVTdpT243M2NWKzk5ekorMTh6OXUvdWZyWDl6ai9hN25VL3R6S3RQMnU0ay9wZk1VMlAyNWxQN1gzSFkrZi9zZDM5YnVQN3AvTS9kdjduN0ovY0FmMXZtSDZKL01LZjN2bVhtZjJ1NHNwTHRmM0RYN3gvdEVuSitmOUlYVlBIKzBIQ1hpbjl3UWVWdS85Z3c4aUNmN2lvMVdvQi9jT3A4Ny93QlJKVDgxQmpmMmtLa1BiSi9jK2tML0FHZ21rdjZid0xadVA5b3lMTGRUKzR5QTduL2FIQmdNd0hQck1EZ1FUUEdkR0lWY0FUeGcrSUZOSlU1bWNzRTZrVnhEcG1ITWdMd1Fyb1FhYUVCdVFIRFBhR0dZTFloeU13eXlTdkRCMXA4dzRKZmk0WDJsdUlWam9mVUU2QkY0K1lYMmc0Y3lBTllDa0J4TE5vZFNGZG9BMEdHZWtLN1FQRU9CRHJEcE9xQjNKVGlWZVlIaGdkaWRNSGlkRUcyaHNFOFoweHJxU25FT2tPc3FiU25FQnhLUzNFcHhQRW5oQlhwT1VnOFE0UHFBNGxIUWdhMG5nZkVMYlFydFBHQjRsZUlqaUIzSVNJYWxST3hQR0w0bUVldjQ5U1U2azhZMjJpTnlJTm8wMmo1eExzenFUc0h4TGNFZWhIREJFendqVGFlTWVzUnhFRzBlQkhMTWVrcjNLWEs5eEhjeDJoeENWZFNWMkdlTE10b0RobU1QeGVMTU5vVzJsVGFQQkhhSWcyaU9HZGlwWjJuY1pSaW5EVVRlQ1BXVTRpTnlOdEpqc1RLV2RCZkVjc256SHBGM2liQ1g0bGVHVmRwWGllTVh4TDhNVnNNcDFNeDJwTjhYR0lOMlV0WDFnUllVbktKZ3FuQVFKekhFcGJubG1nODkxTmd6ekZkaWlGaXZFYUlGZXBWMkJoZ3REZVZ6WU9TYUorQUd3bmRFc0NNR1ZUc256VzFMUVZZSVdsSFVoMGxPMDhZYzREcVZOSldGTkNDNmdqWWdPSVcyaDdNRCtBOXBodERkVW9ta09CQU5DRzRNT3NPa3YzQkRrZzcwaDFobGtnT0xZSGNoWFdlRUtiUTVrT2t4MEljaUhJbXZTZFV6TklMaXZ3S2NNVGlEeEExcFBBaHpKMklkWjRST0NITWdEYUFyU0J4QWJRQnNTL1VQRzRFMUlHWmJmaGp0QyswcnNTbkVEV2d5dkFRNDFPNWNIajdsSWNTQk5wVGpNOFljcGk2UnZvVHhsYXpLOFRHTjNhZG9TNDZUTFNaN0Vla2E3VHVUb1RwaVBNeFlqZ2h3cWNoSzhFb2JSOEtqNHg2eFZZcU1wNGp4ajBpM1dPT1NWNHVJdkJGUXJpUFNQNHIzcE05cGpvVHhuakx1cExiRXZ1UjZ6RGFaVHJjdzJtZXhOV1NadUNNSHBPaERtUXR0TWRTVTJKbDBqWjJoU1BTZW40bzMwbEp1bkVlcWwyd0xCZFFpTmlEZGdmTWRZRHdTa0NPa28xcU9VVjhGejZVbEdtMHp0eWtLZGthNmZCRmN2aURyUm5BWTVxaXFXbnFPYlBrUytFK0lPMkNiQkszMWN3RFh3UWkwWGRSRWJHNFEzb04ySFdCWk5BRkkyRlJBUytvbDkrUmhTazdXV1B5VVRDNGVJZTBQcUJZRTJJWllxZHFtT3hOV2tQR1U2L0cwdWJFRTdFRnhFNGd1SmJjaVhwRDFoQmJpRmRRaFhZSmJZSUxxSEtCZ2RvQzlwWnJVQnBVcHdUcCtwNHp4Z3pRSWNVdHhCdkVGeExYQStDVzNJTHFYZzRLQzRJcnhqOEo0dzZrQkVkUi9HY2FobERsVVBHRGc0Vk13dnBCTGY0VHBEcitKbHpDUzJ4UFNGWUhpWmFWS21wQyt4RGlsTnBSMnFhSVFkSXhyMGxwVGlNWjdFUnhNWWRZeDRTdkVyTXRwNlRBMEk5SWhqR1drcCtGdnRGUnB2T3hQV005RVh4SG9SWFU4SjRUd25oK0xMYlQ4ZGVselZvUjZ4eHdTKzlSVVEySmJxUElSNVZIaEx5M0V6TkpmYVdOcDR4YnBQQ1VoT0drN1N2RXJ4QU94TTQrUDRNSTVqMGwzUWhiYVBBWXBTZkNNTGpEeW9obWh2Q1FDM2oxQXRIRFFDZEZxRFN0YWd2dVc0TndCTUloNElOdnZVRE5PRkpqK0Q4VEpxZFZNdUd1b0V6MTFDTkcvRTFDTDNCY2x1VEN1K0xnMmc2S2xnYk81WTRQY3Z2QTl3cHUzYkZESzlSYUJ0eXR4bG1EeE0rbzdZZFNmYzFrUG1JMWI5d2dIRU9GeGIwK1lBMUlGTVhNUHhJQ3dnYkZObjRnK253UUhWZkU2V0hYNm5ZWlp0RDlWRGxDUnVoQjhRZkZRVXZ3eTB2RjRoeUlIYWRFTU9ZS1o3VFgzUDNpSFM0Qk5JVjBQd0RBZVlBTVN1NUcrMFB4NHdVT3M2RTdUeGx1SmZ2NGc0S0hNblRCZHhLM2xrS2JRRU9FS1FIL1pYZk1KdHhjSEJiazdrcncvRXB1WEtiU3NKOGZxQ2c1M2hMSldNOTh6citMV1U0ZndjY3g5L1VzLzlsK0pmWW5ZL0IvYktieE96QTRqbHpFcEFreGpiVy9pTnRwN3pMYVBTS2RDTW1WSzdUYUZpaWdOTEN6V0YwMkpwZ2Mzd2lDMjlvSnNFYnVqUEdwMUxuWWoxajFscGhyQjJtWGNMenhnM2FDNGZpQjNVOVFicGIybGswK1NYLzZwaHUvRVZmTVVkSmRhTXJ0UEpHTEtFRHU2RU1zYk1KM0ZpZndCY1dPRVdKRnIzV3dEVVlQYUpOU1lsbWd2Qk5DWDFPVGVwU2VZYk1JOEFvUXR6UXdzQjJFYUx3ZUkwUFpnMHdQVTJ6NkpYV0VnOUxsanBGMlI3aHVUM0dHSTVFRmJYaUF1OWRSZmk1bVFPTFdwdlZNSGROVGNacU5CM1A4QUxGUDh1YmhQY1UxWDVqMlpyci9NckdkMWdnZE9adGJ4QXZhWWJMRHlKaHFMQWNRRzhRM25SY0Fib3lqUXNWZEtIUmczWm1qTWNtZk1iN0VydVR3SUM0bHJpSnNLOFFJcW00TFdBalVmaUhNdWRKV0VnclNCM2dPNEhjWWRHSFJoMGgxbmhDMmhCY1F3MFo0dzZNT2tBYm9qaWVFSXdoMVQxTFE4cGJ1WDduZ3p4WWNTWE5SaGZRbklRUERVQnNNSHhDbXBEbmNKT2pCY1FyT3NGdExid2ZETDl5MHNhM1BlSG5BYmtwc1FmRXkyWVN5Y1NFZUU4Smx0K1BuTFI2TTk1WGhqd3VXMnVVTlNVbUV1N2ZFOTR6MUpnNlJ0b005cDR3NURDMjA4R0Y5cG1oUEFXekp1eWFJbGFQSWhhNkxwZU01NFFaWEtYS0lxQWVhZjNLUEc4cTVTeFF3Z0k5TlRzcVhuS1lsaTE0KzVpYXVIUzVzNWZDRC9BRnJEKzI3aVEvRFROU2J3NFV2cnRKcjFPclZEc1dmeVNDV3Q0U2lPTWZFUUV2RG1EWVZ2ZXdPbDlSclZIWW1lMGEzV0FweURReGRzWGNqK1pyWGRpZ2lzY3RHRjNuckNMM2F1YmgyS25zUWtnam1DQk9QMFRzUmF2eWhMb3UrSnZXWHRSUDVPU3R2OXBEU0xkTFhRZzNkM3FWbUJORlBjWWxZeVp2d1RUUmxESUU1TmlmTmVURE1FQUJ3M3BLSXR3NGlFNU01WXNYSFRFRFhiZVdHcDIzRVdxOFF5UnVLbFNlUWhEYndrRmNyeExPbDhrMjE2SVpXWFNSY0IrVEVERDNCbUZIczR0QlFMR1Z1eStNMjBDWkxtaVVRdk5tWUtSTjFFS1JiYTVmOEFCZmlEM0daUmRjRU9zc2FFR2FqQjdFRmNJNmtLN1R3aDBnZUpud1ZLSlhvUTRFdWFFczZrRkw4UTZUelE2WEMwRmRvUGlZY0VLYlFuRGFIVS9NOFpmaVc0bHVHRDNqd25qUEdDZHFtUmtoVFFaYmNpdGlDM0g4MFYyZ2NRdnREcktHcE1Ob0RpSFNVNG5qQjdmbU44cnhLY1I2UWZFc2JUUmtoYmFaYlRHRmR2emRpVTJ4K0pmV0JoNXl2SDV0b3JpZUU4WjFsdUpkbmI4U2U1UEg4QlMwRWFrckdZaWlpVThUTlZ1SVVWcmxZcHZ3d2xJalBhQUJUOEUxN1IweERkUFROTW83dVNha2pqU1lmeERIaXJkcmpLL1pZbzArSVhMRE1hMDZ6UDN2T2NIcjE1VEV2ZzFMVW5sSlRMT1ZHYkV6VEU4VkYrQzVVd0I1SnNDQW5YRkRCZlV2cVhpSjF3ZFEzbFdPaTlwWlZxQUZTUmcycDVtTjFCZkYxRnVQaEU5ZmxFaHA5d00xOVM5bkhtWWx5RkloWWUzU25RQmxzZHRvUVVubExnZ0MrcWhnZ2N4OFJFdTVzc014S2NFc2tMeUV2L0FCSTFLRFI1M0hQcWtRejhFVjNtVWE0aEZxMUc5a09HSmVTVEl5N1lJbGNyN2hUZU5teGl1WnZDSTJtYkF6UlMrcHBueFFJdC9FcDhyaU5EVjJxVkp6ZXFKaE80VVdVRDE0ZnVBRHRVYWZFczlHdEN3QXJET054Y2NJSU1TUkEwV29VN1NtQjhrc1lUcHZxSFFuZ1E2a3B3L0Vyd1FnZENGOWlHTUhTWWJRSnRBbTAxNEpkMUowRnpwSVdKd2t3YVMzYUdPaFBDSFFtcmFEZGlIaEMzRXJoWFloWFloMWhmYVk3U3ZFSjlZZElmcXA0L1VPUDROSFNCNG5oT2tXZHFtRzBQQ0ZlNVdvWDJsdUxuckFYbW9kQ0I0cVVxTk5vV25oS2NFMFM4dmNPa09rdkxiMUs3a0R4QzhvVHVYSzFwQVRwTGNTKy80dldWM0pYU2llQkhpRVBIODVGTnlWblFtZXhQQ3A0VEhhZUZUd2gxaDBQeHJ2VTZ6R1phVkxiNWdqYVpSTTUvR2lXNWx0MjVhWHVDZ3pXWWFZZ3pTTzBwVi9wQTNIelQvVklGdVpmclROeHJ4QnQxKzVsUGx5bEI1WUhnVFlSSURYWlNsRWNOYVBERFpSOHorS0NDNVh4RnYzaERNUFBMVDlCTStrOVM1eWVZeXUwWDZIa2h5VUIxcDZtay9XYTU5SUFjUEUzRlBCR3ZGZHhTODY1Z3BRZW9haGw2bEk2RHFNcFR1MEkyMVhpNXBRZUtJL0M5N3BMU2xlSjgvTU9zcWJmVTZqM0dmaUlOQURsb1J0Vm15NVJHbUI1eENJTG9ZalZvbm1melNpTlZPZStJS3lmRTNsOFJKL0lRUm8rSnBCOFRHQU81bEdUWWxnV0RtS3E5RE1nSGdSbmJDSVVBTS84QVJLanFWb1BpV2FsK1l1anhDLzhBU0sxdGpia2NqZERwOVFEQWtPVUIxSUg5SWRZZnFvY1NIUDhBaWVFOElaYVF6MGhKMG5LUXAvNUMyMzFDNWorSlJ2RGwvRU9sd0hpVklYaFhVaFdIV0hoQXV2ekFkd0ozTXRwbnJDbi9BSkJkb2Z1cDR3dC81RGtmVVlhekRTRDRtako5UXQvNUFic3B0bWVCTzRWTWRKNFE2VHdtRzA4WitzUlBVckNtMDZ6VC93QW5nVHhnNE9FNHlsYVQ5WW5qRG1TbjZTdkgxRVNzODQ5cGpGazdFZXM4S243cWRQeWVjd2p6bkVtTXpqM2pHVXArQlBoUEVaNlFydEMrMEl1N1hPNVVacnV5cC81QTdTbjZTcC81SzhmamhFdlEvTzk1NS9oT3NPVU42Q2p5YWpDNm5pTFI1c2dvS0hWSVJMVjZpTllRZHFrRTF6T01yc21rSzl3aWdPaVpGTDFVUlczM0hFVG1vdVpDL0VwTWZGUDhqZ0d0ZmlEditKbGdIWkNNRitKcTF2aUUzS0lSd29UWW51R2dicU1SN2twRjhGU045aFJHVU03MEpoQTNKU0NLYWVJY1d6ekN3SjBSM1M5c01JZ0xZcEsraW0wREtwdldaalN2b200enpIODllb3IrRm0yZm9tb0I5VC9DSUhvSDFOTytPRnZCWUJ0UytVV3F3YUJHOEEzcVo0RHFMdGs5eTIzZnhQMUVXUlJMOXdYYkNabkt6TG51Wk5KRU5ENmx1aDlUOTZqelBxRDNHSWJZaDErcDF1SE1oNVE2L01PazZQcjhCOFE1UUhjTTlHSFdIV0FOb0hpSEUrb0hpWnhmYS9qOFRwQzdnbGlDZVlzV1c0bmd3NnNPa3FRcHRBWEFNQk1HODNVWTBaWFlqYzZMU0g3bWsyUTVmTUZFQ0lxVzVoVm9GbzBZcThYTGNUZ0ljVUZ4QmNTL0V4MUpYdU0xNG5qUDNpUFNkSnFqMVlkRm54bDRWZy93MHdtdkU4SmJpWE5wbG9mZy91cGpQR1BBajErcGJ1ZHJqNS9qOElSUTRubitKWGFZNkU3NG5TUFQ4RXozbjd4TDhma1AxVXZPeCtHR3NvTkppSUxwT3NYK2srWHFXNCtvbzJKVjEvaWVFREF5bDZTcnRHVkZ2VUR4U0tNMytadmwrSXNuckNiaDVRc3RqUzBkcGNQWDhrS01QNnFVT1FjWEVybytZTFpnRy9RWXJiNVJZb1h3UWdvM0RDTjA4UzQybGJwUlV6WTV5c0gvQUpkekJKZUlycno2aGNKN3BDV21QTjRrbCtDYXZkMGlpa09pRm0wWEN5b2NLREE3d2pENWFJNS9LSnFYN1dHZVhHMVU1V3BneDRVQng0V0hQRzd0TUNINFZCYks3TVlycGhqalZYRUUweEVkd2YwalNNbzNoV2lFQ053U2xlRUdWeHREbEZPekNwWGdSNWhEMUJzQTdaY1V1b3dvbkVFZVZRUm91VmNYUjhDb1ZjcUh5aWpxUlhVSUF5RXZZcUFYU0FnZGlCZHZ6UjFoMWdHcE9TQWgwaGZYOENUckE3a3J4K0pYOEpmbUVBNG5oQlE2c0IzQ0NCWlZsNng0S2c0UzU3MFJMZHRBQStBekY2WnJUNXgyM1FXUFJjRE5XVStRRlhMeWVzMlI4RVM4Rk12M0JiSEFGZzh4Umt3L3dFRGJLRnQzQlpxbmVSdVhVd0lYb29PRnRrSHhIeTZwVkM5TlN0QzR2QUg2bEVzUUI5VEhzQnRwSTRxSFlxUmFLWTVhelA4QUEzbVpldEpuTTlJVTJtalNlTXR4Y0Z1U204QzZUeGh6SmgxQzhwM01lWmZpV2xwanRIcm1XZG9QYy9OOHZ3dnNFdzFKNFNuRTZFOFkxMmlWTTVob1MvRnp2TDdrNmt0K0Y0Y3BXVTNtZWpIcVNxbWRxbmpHQ2swMG1wTFJoS21PWmplRUdwZzZTblNDWWQ1ZmtSMVI4eWwvdWxYK2tDMEQzTWF5TWRHKy9NVDA4VnhldnlSUzFmTXFvRGpWUGlRSzJIektranVXMVhlQ2FvZmlQODl4VFVmWXNTbm9uTGxyT0ZnR2E4UmZRYnVWQmplMHIvR1VtZ1JmV0k1K21ITDZoanpkeHhtQVZIVURGZGx1NHRaUzZVc1czaXN2R05vRU9VazBSY2VlRUNvYzNQTG04ZnlweUdXc0krWVZXR3VYRWI2YzRBak1LTjAvdU9sQjVUU085REdtUUlHVzJFSnYraUROZDA0M0F5RDRDTzJPdGFZZ0VSdW0zaVNtWTh1WnNSdHMzM0ZnNVZ6MXdiMm5ERk8wMWpYTXExWUJ2Y29ZcVAzcUsxWUhFR1VRSEZRYTBnSFlqVGlhNTRrOENBNm5oRHBBWG1HMWlZYnc1eXNCNWhiUUlTTzBDb0RnbVhRbE9JRnBtOVVmTE5WVHpQNDNMOUJPQW44eFE0ekxxQ3VDQkNxdzcxaExtRUEyOHhxaXdvcVJiblhuTEVCYTBmcVlLV1E0V2NWNkoxdVpaMmRjQVFPMzYyNGxBMzBwQmxSZExpb0xjYTRaSlZtcFlwU3ZJRkhvZUphTDlwZkJPa0pNd0hBMlNTbWk2Rm84VkZVZHpMUXl5OVpHMFQzREx1MFVQREcybEV3M1UxYzJuSlBBeWxWbmFNMlN6YUY5b1YybmdSNWhLYnlwRWNUMWpGUE0xWVBVdHhMbXM4WlZoQjAvQzNFT1pIcEY4UmN1YlJlNStOM1NZYXlzeGdGSzNLRVlXeGJMM3BQRDdqUHRNNExjbU8wQnhLOFN2RXAxRW0wVCtEREpGSWxURDNLbFVhUzJJeFcwQjNndnhTYXozK0tTWmlqVmoyaktOcFRabm5HemgvQkkyM2k1YmVkNVZuU0VXc2ZxSklwRnV6MUxOZ2R5emdJaHIrSU9TSjJzeTREM1ArVEE2M2xNTHVRcXNrS05DSXV4QTdKZmhCMU0rQzVxdE9VcVU3TjMxWW9vR3BaRFVRdGhvWVRZRVpuM0hWQTdZUHFLS2hkMXdkOXBIc2c5UkZJME9LaDQwTzl5dUFOaUZxaDN1TmhqdEg4a0NKVzU3WWhiWDVtN01ENWlkWTdkeGZhTHVrVTBHSmJRSFVkNk81QmZrVm1KWjhBc0o3WlFMaE5BZmxLVis0bjBpUS9ueTVLUDRxYVlmVWVQZzJQbWxERGU0YjBUL2dSV2grNE9aSHVhY1A3aW0xdmNPaEFia0J2K0NwQW00UTFTaFdxZ1BNSExNVXp1aklsYTlUaEVBaStXNUh1NVhhY0Fyd1NZMlMxOFNwVkJTejFIZThWajRUU09YVnNIUkxWdjdJR3NRN3pjQmNTNGtiUHVGRmtCejJnd1FLeTRvUWRUcGh5UGNFTGJBTHFJNHdXNFI5UzNqT1NHVTJHSGNBQkpwYnM4Uk8yQXhqNWxJb1pKandYSHhKV1RmWE1MZDBxSEw0SnlseHl3b1p5MkU5UUlzNnVrN251NFJWdWlDcG1yc0VBRlF1c2tVNUwxS0swZmhsSFJiOE1YV1E4akdNdWtid2JwTzdBRUw3UWp4bHVJY3NmZ1VaWFRDUzJtSUNWN2lXSk5vaDJuQVJSdEV1Z1YxTFA3SHpFQUdYUS9TWmY5V1pBMFN5OEJlU1ZFVFhPZ1VlNkRHOVFKcnBzbVNBdWtMVEtlRU9zTGNSWk1kWW5pSVJCaU9tSmVDSWxaNFR1U3JwR25jZlNOSXpiYVg0SUxlRmpUOGU5VDFpQ1ZqV2RGakZ1SXVLaXVJcVgycVg0SmI4VGhNZGhuaVNzckVMbEVROHhwYlBNZnlqeEdFejZYN2dld2VZTm4wVERrK29GTkg0bFRnWHFCT3ZBQ2FzOXRwQmdnbkxTSmxRMVZtWmVGNjRZUllIQUZ3N0V0cUNVWTVOUXNkMDZGUkJBZGQyNGVCTHdpUnZQTXkzd0lMVi9FVXlKTTJGeWhuOEhZRnRGc0orSnQ4anVCSWpDdW9OK2hGcVBpaU9GOFEyNnlhZzR4MnNQcVlPZnVBR2dsZHhXdy9pTzJ2aWJMNG9zeDhVSnI4RUlhL2lVY3Y0Z05aclRQY29UM05KWDNMYUp6SHhEZnlGMVRCLzRUYTd4TktaZUZIbVVKSFpMZCtIY1hDbDVoenR2Yy92TkRlS0JaR3A3eXcvOEFOWlE1YjNHeWx3RkNxVmRFcndTbDM2QVMrbVBud0xiRHpDRnNyc0M4eERWMUlUS2ZXTUdxZzZ1d2VVSEpUR2g3Q3VwQWpzS1pNVkVibW9YRDRocnM0akNUV3pXRUFFMFhieE5WNFpGUWwrazJHWmNGZHZXSEx3MXlTcUdzVmtST2MzRGluU3JkckFGbDNZTGdYU2Vtek5Nd3RNWWw2eXExV2RNMVY0QUJQTUY3ZERqQVZab0FpTlNYUzErSm1RR3JXQjFIVk1aSVhkeWhLZys2UXFVZ2xkRWZFZXZGRjVlNWNFNmlCQkpXbzBDVXR3YVZDK1ljMDZVakI4Wmh6dUFsWUNWNGlYcWRKVGVaU2tvUVBFS3dLZElGdGF2RUVMV2dnL004RWVSOVJMSjNDVUl6QmRpLzFIVkZhcUdEbXhYRTh4SXYyb25QaVVMSm85cjB3NkJ3RVBtWEF4cmxNTWl0S255WXRQR3NDZ1RtRXJBOHp2VEV1QmVqWFQ4UXE1ZlV2WkRoS0lsUkM5UHVKbUtkVDhEaE93elhLU2tEY1RHN3JjNlJidGNmRkJ0cm1xYjFDaTZYS3FZYnBNb3R4OFFQai9lV2xPQWtsVElJd2dZMDFVYldFMndTeWVua0ZZVDBtZGRYREZLMG1EUUw0RXUwRDRsVXdqcGNTTHc3TXFlOFpRYVFoMUJSZTBPL0VzTEdJMFRRUFV2Skd6bFBWRXp5cHpOTy9mUUI4MEl0R3gwUjRON09oRlZwUHROWE9SUzM0Z1FhOGhsS3BXNm04OVZoTVlEQVkwM2tndkh3RlFBdW5CR3JLNUdhc2s1Q1dpdUhjYkgya01vanVML3JUY0wxRzhJeC9FaERvTk9LZUlsa0p4QkY2aUcwdVBCSzltWkVHYUFpVStNU2hzSjRoTkdqNGlocStwUjAzNGhtQTlSREMrSnZuNGk3ejlrZElFVG9MNUlQNFNvRXhkNGlzQU9xaW1RZVNEcU1EVS9pYjM0UnpDL2NyWkVOcGxteU93U2FBcE9VK0pzTjhrK20xVFQzOFJHU2NJajEyUGN2ZGMyZEliWDJodUgzUCtvbHZCOG9FQlJvSzJKWUVKWVNaanBhRzZsZzFpSWoxRmdWT05NUXJkMVhjS3JSYW9LZzVBVTN5NWN5U3dhSXhlT20yWTBvTHBtSkRsWUhETFE5NENidlFjUmxKS3NVS0dWQ0M5d3hUVU9Mb2hXQWNkeENoYXJCalloZEt4OXdxeE5BYUVlalpZckpNZmxNTXhMU01iRzlvQXhDbE54aTJHTDM5U3hGT3VrZ05wb1d2aVpjR2k3ZW1ib3dqVUNTQnpRcUs5aDJyTUtWemJ3SmF5MkhSKzVpbk9mOWhqam9Ba3J1ZE1LMVhCRWpFVTBWODBJSnFTdG84VXcyNUJhUmhXZXdVc2pYSEpac2MyTElOVkt6M0JnL01yeSswRHQ4d29qYUJIMStBc3pBTUEydUY0WTUwaGVVcmNIY3d2SW93ZTVWYjZvK3BSRUIxSXh2a0lnc1NGeUNsK2lUOXprVURRUHhHUk93SmYybVNRTlhtWDlRMVd2cUhvdW94aUplTXpKcXl3UWJ0bkwrNkdEYkJ4MGFnVnRXZTE2bU1RVUlVT2FtdDl1Z3ZHWXhOS3JiZkREYk5NWkRCbDJGRWNnQzg3UDNENzVvY2ZNcURheUhCKyt0Uys1MDVtajZnMkdyeEd2QzlTblJ2VXNNRHFwcGdkd1JueUNJckQrb05ocFhoUm80YTU4MXpTQXhyQTAzWjBiT0J1T0ZSMjd0aUxSeGVyTStTNGx6b3VKb3dpeC9QRkVnVjIrU0RUd2tEWWphNVE5VGtQN2pOYkxTbk1Jc3VjYjMvQVVCdDV6QVFQMHR5dk1IWUNMVkU4eGx2eEpjdEZ4SElzYlJzUWx1bFE3QWxrdXdSU1RoakRlMHpmMTJRakI4RVF3UEFtTkE0U0YxNlNCZld4TmNUekd1dktFMVYrb24vUWk5ZmdndXo4UEJhQWVLcVp0ZTFJRGhQaE5xcllUV1Q4d1MyaVpNUm9FcS93QmlvWXlyNklDNXJtUWlPd0lPb3dCdlJ6QlFUZFB3REJoUzlxR2VvaWRiUkM0Uk52VXZiUnZxR0w3ZmljYXk2Q0Nyb3c5VXAybW9CSDhoOFRETlBES2w3SmwydXh0Z2VKQjhYRzRnZ0RyQnhVQjJoY2dNTG5CekUwRjNvamxFN0Q4THVDQ3hwU3g5eS9id1hENmg1UkVUSDFBTlpYZ0xpelRNb2crYWxFZWF0WHlTOHVzQ3g3bEg0d3JiNkp6Vkl3V0FHZ1NETnJDb1JId2V6SWtCalJqS2dKcm85VFc0UFNXR2d4T0dsbkZ5c20ycERMUmRyR1cxdTRhZ2pZdDNCOHdCbkdnbkx6TVFXczAzMVBHSUIrNHFSTnpLdk1YZFNnaXJiQW8xMjJpTEVYTGE2bFRVRXdGRVF0YnBGQVIwQVpxUGJ2aGNYTllzS1FzcWVod2xRbmEraWxlcG5oemdWY3VZQ2pjQ2FwSmdRTVJnZXdZRDd0RExqYzlNQ0lkOHRFQ2kwRnM5WERyeU5SaDkya3MvVUNEckNUL01NMzFZc0Yrb29zREk1UkdMSldZUzNseUFXQzB6cGpIeEZrQWhaMGlVcU02cGxTTDEvaEk3djFHTGdsamFpaVNaeEZJN3crTC9BSENHK20xMUxLbWJhL3lSVE9HZ0h3VEZZT29vODZ4dW9OcTdQY0tKOFpzdkhhYUtYQlJ0RkxCNFNlaEJldVNHTEtZSVk5djFNN0YzcXhFa1Z6b2lVRlRWVXVMRHU5WGxFUUJkQnIwc0JQYlQ5N3BHWDN6YVBFQnAxcmNmQ1grWlYxRjZCY3RvWlZteGI2aTRuS3FWQjhSb0JueEJ3dkFJZk55aGF6SkZJa203cjB3cXB6SlFQY2FpTlo5RUk1dlhBM0FBNHAwVEl3ZUNJZGNSTVVZdUlqc2p3eFNDeHY4QUthSXZjTklYdUE2RDNPUDVKcFQrV0s0OFNRMnJsbXo4NERWaDJRYjNTUjNXK21hOUR6R1dISGxtcVpDd2JYSkMvZzB2Slc4NE5uclRDMnRld3dQMTdBV1hkTU9yd1M0SEl1b1psbEM3OHY4QURMVTYyYkdQY1EyWU43K0lCc3g0cDFSRjZSSEJFdG8wYVNqYUp6R0FYQ3pBM1ZTN1FZbnlCTkluaG0rczh4RVZ2U1o2UisxUTRRMDFJbFkrc1h5K0p2UHBFYU0rSTdzbG1ud1FHMEh0R3ZHNnVibXM3bGNXelJqMnFhRFhaZzNxUnVJSU82SVBTKzRVSFBEbW9aWlhVTjByd3VZOGZWVWVRU0p1VzRYQzZ0Y0dtRVdueWx1VEFjNFd5RVNXcDh5OE80SG5MRk1lMUlKbytTWFI2eC9jQjFEM2NwMis0VmNFRWowR2lOOGlDNTdSRjhLU3JuRUg1Sk5VL3VxYjhRdmNVUHA0dGwxVFdtZzQyVENFcEJSaEYySXBlQVFqbk0xQ1ZMOFZES0x2MHJ6eXhDcWROTExtUlc5bFFHcVdvMENHTVV3bGd3RUZZdFdrR3VzMlJPUlhBbVdqS3dORVBGOGVUQWljaFpUb0x1Z1Jha2JtQmR0cGh2Tm1rSG83WVFVSEpmbTROeFpjQk9DNDdvU20xeU1YQWRnZnVNTm9CU3ZVNVJ0MWZVTm9POUZqL0VvVW0yTy9qakdBdTREZFFiRTl1b3dKVE02OHRxR0p4d3JDMVpEakU0V0VHMTlEbWZNQXpqSnpvajlUWXBZTWVMT3RFbkVMeHhFYmJ6TktHQVFlb3VxalFUTzZMSzBJQ05FVFBiQlNEUlByUXBTUFZDa1FZMDNGUmM4TFZ4Rll3VkN4WTNyamhXMERXTFJNM0tSV0YvbG9sMnRPa1N4TmRkUWhZYjF3SWNGT3l4Z29MOElFcHhHdHg4eHhPY0RQN2x6ZldEQm1FRVlLbVM2cm1SdU9tNHpRR1dueHdEUzRjVmhrbFQzdGpQVXJoYnJ2ekJha0Jod1hLYzAxckJCRUNOU3pFRitZNW1UM09kejBORUplUkdVckErK1FtQUU2VTdneDhvR3RTa2d6SlpBMTFnSXlZallFR0NEY0JoTjN3cUNBWFpDQmtjUU56dkY5RlI5WVZvVlRBd3Z2dWhDZ3lNaXhQUHF1aUZDZExJWUpKVmhBL2NLTGFQRUZsWHFoQnlreTRpT1NZRE5Tbk04b2NGbDFyY0swUzcvNUxOVDZZRXNQbGlIV0Y3Z0gwWVE3bmhJUGQ5UjJqN1B3aXVBQndFWG9xZGtONzRJNnB2QkwxZjRKZGduT2tRelRIOENWd1I5YzZNOHBVVzdITnhNTEhsajRPblpqTU9iaVFhTDAxK1YvZ3NlVWhnWG9YRU5ITHFRbWZqaFBOWnV5QUVyYUJ5QVhpTFp2bENKYVhvSWJaKzRoaXRMOVpqR2c3Smw0VnZGUmpMNUZwY29UQ2MwZnRjUHFUc2pXRGhiYm5ER2NBY0tqTFFQVTFWbU1jTlBHSHVWWXpLTHlpbzQwUGRJUmZsUm9qOGx4S084bFpWNzJHb3hma0hFTnBQYmN1YURoZjQ3UmFWTjlUZEh6RmJoTGJTM010ekZ2Y3Y2bEtMZFlydkZ6bElyYWJDK1JEUVVnZEQ5elFGNFliaVJjSDdwb2VZaFJHaVd1cFgwbVl0cFlaVFlGTzZpaFc2U2pFamZmSVZLQmc5VTFVV0hiclNEQkkwTEVOTGVDUHA5WWhVQnFhc3JtY1pieXBvNUZXWTB0RzBLRTFwbUV1bVlxSEdrcEZCSGRTMnc2M0JvcUxpemNDSmFUSmtGbXBsbXBMNEZDNEFiWnhoTlpOMmtTaHFHdGozRmpYZGdPcm13d1NRdlVhWU9vcGFsU0JXb1BVUWxzU1dNVEJUT3hMMUNDbG5KZnd4S2NjQUpYMVRXb0QxQVYxK1BmY3VkdUJXdzVWdTVnQldxUlgybVRGWFNRQ2tNVmRNaFcrTWlDVkRjbzJ3dXluYlpaWDdZNThRSmd0TkMvTURtTm9NZTRVVFRVSHhORXFONm5tVWEyTGN5RUZWaUxCcUIwRnp1MXdWTkRCczBocmphRlphbGM1TXFnNnB1eFVLcEVZcDVnMklhMGZTeFBkVHpXVU5FNkZFeFd2YURVYVMwTTVCaXA1cFpZaGZZQStXQlZ6VlJtL1BhNVFZaU1EYlJqMHA4YXg2QjFxVzRLUURzdjVsQUpZNlNaSHhlcEFpYzZVbzEycUszZk11YXNjQkRhY3ZlaGxuZ2VJdXl1ems5ekpQc2pWOFRJcUdsYnhPMGJ4RHNrdlV4Y0Jpb1ZIUnpBcEZ5cldaWlMxVlA3Um1WVGZZbFJxTGJMd1pYbDQ1aGJpN3luRkRTeUt3NGRiaXRZZDdpSFJGWFJLT0FBcWlFS0FYRXJGako4MCtVWlNXVjBQZ2hTV3ZTTGErRUdkNVkwN3ZiR3JPNGdLQmo0TWx3SFZDRXc1ZG02WEttbmtodFFPMkVza0c0c0xmQ0ZlMzBNTnFFcUpqZGN1UHBEVVpLTHlSejNlWTlIeE9wOFNwMCtvY0xBZHB5aktScEREUXd0d01EWG5FeGZoU0VaQndJaWpLZVV6VEM4azJnOEVSdHQ5UzdWOWtGUVF5dkZUaTFwMkliU3g1cVlvLzBtNjlGSnErZHVmYW9zL1lZNW9aeDM0anRvN2d3M1kxWklocVhMaGlHRHl4SHlqQmlJN2ZNMm1JcnpOeVI4VWFOSXNUaUp4Rm5SRWRJdXBkN2krWXRtZThzMHVEOC9FTjJLYzNQSjhRRFZQVXJNZkJObzNxQ0lDSEJVdmgzVXVoSGRndzAwckZ6TVVGK2txZkYwNk41aUFhdFM4d2NnTjBIZEZ3clkyQ2dsc0dLMFhHM0prRGoxQTRzcXpFZkhTaHFXTkxwa1gxQUxxZGdKS3NxYWpWQmFEMWlWSXRzQXFkS0NVWWpOS05wRm9IK1Z5N2orVUtudUg4b1lMNHVja0hOZVpZRXRmcnl6WXlPVmpORXRpZ1hGVWRZUzkxekkyRVFnVmpveE5oZ2RGaHJBNHhDYlhXRFVyTzdLbEh6ZEkrSTlkYXBvbk1LY1FBVXFDOVZFWUVvZXZsM1RuRWRPZThoY0VvSSt1UTdXU3h6UDBZU2dZZUFxa1NtNkN3OXpjN3FRL0Z5NUNIVWtsM2EwVy8wekVjZUpCTDlMRnhxZ01kZ0UwaWt5ZHpldUVhblRWRDhTNG9tbHA4eFVJV2pkZ2NQbFNVUkpaMElNTU5QVmxkeFlhU0xERVJDc0FuaVZSNFpCRlZaWElRdE5YTHRCMnFPbVI5UGROeHZRbGFvUEV5SXkxdEtsTWR5ZjFCMzhUK2N1RDBmTXlDMTRpdXhuQnBBc3M0aDlzU2xUdmJUU0Z4b2Qyd1RPUGNTb0FEVktDVmp6VEkzNWdsMHBmYWVJdUxJVXJ4Y1krY0Vla1FHaktsVlI5cUtxRndnblFDeWlXelZkSllsQzA0aXhDNm5MTCs2NFV4QkFIMHZwS0Jxa0ZnOFFpd1MxNXZCY3lPclU2cElNc2JhS1BuR0NReURDUXlZY0xNeEd3TU04NlNJNWx3c0dVTXIyRlhCQ1NtVnBMQmhyWjRxSVJ2UTdubUxsK3lTVkdMSFlWTEVsdlc4aEVidUVZZVRuU29aZzk0VzV1ZldYSE1nSFpMV3Z3aFdaVi9YRW5MNUVHMUNkRUxiZlVGeFV1YWtMN2ZpdTlJcllpcGJlNFUydjhSMGdjU3V4QWJrcWJUd2hiYjZoekVnT01lSUNLc0M0bmhNdVJnUWJhZ2VKVTJtZTBHYWpLWFQ4VGJhY1JPOUhnbUcwR0Vha2VLTTBLZ1hrandpY0xGNFdMeUp3R2I0bXlINGp4UlczMUZiWEZtbFJhNUlyT3Z4RWRuNG5BWUxxRDNTdlpnUDlLYWw4VU5VajFEZ2xUcDlRTjBQaWNKOVFUbjRoV2g5UmFudmRpb09hQUtsQmZ3aVNzRTZ1aE1wOFZTNEptbkdoMGl3RVppNW1PQzNReGJLVlkwWmNwanhoaVIzVU9NRWFGRGNKTUxGWC93QkJBalpuS1pvb0FTeS9FSjB3b3BOVGNjZFlJRVZ2bHlqYkZxSDBqR3BjYWtadm1BVWlCSjlFbUhCa3NERHdNQ1BCaXBtRmo2MWtaS1FJeVBVVmF0U0ZMVVJKaEplWW12a0RhTHZxRkZvZ3c0QmdzTUdBbXZHajFhcVJLTnU5dFVYa0d1ZDRaOGtDcE1Ia1VUajZDcFQvQURsMkdKaU80UkE3eXNlcXhwTmxWa2U0aEUvTkNKQVdwZ1FoSTZxUmYzRTdTNmdQdGdhNHpXcG1WcncyVDBTbzZLZ3JyTTRVQjZhbDBCYTZwRUJ6OXNZVUk3d1lKMGVHNWROam1neFljSWxKRXZKMjBXc1RiQ1R3c3N0NWxhVlZUU3l3ZE93WTJCUFhtMUNjd2pCU2Q2RkdpWnVmUWxIUEJhQkF3TnlBNjQ4dFFHQ2J3R2JvdUlzS2ZGeE9oL0VXeCtvTms3S29qWU0xRXFjb0RkbDRsSmQ3RDFGZXpPeEFvUTNlYkNHN2lmeVI5VWNmaGc2ZHhmbElWRWpYWFpidmYyWmxvVTJLUGlVRHpOWml2ZE1Db0lGTTl0ZGt5UVYzT0lva3NhQkt3cGRhY1FXenJ0cVVYd1VoaE9kc1NDQllyY3RFb0kxZGxYOFE4UktPYkJibFFHNWU1V3hjUklXcG9PWXVPZEdWaFZxUEJDanlNWEtJM0F0ZFFEdGc2bnBIbTZ3cVRBWFpBa1BtTHgvR2ZQbU5zU0xTa1k5bEdXUmwxbXBzbUZJNmt2NWdvQmRCb0g1bVQwNDloS0JyS3VVYzN6UHFDMnNxWjRMQUo5VFMxUVFpdkZ4cXk5d3JkZE91OE92aFlqY3NYYStJREtSNnh3MG5oTDhUOXFuak05cFhpVklyeEU4UzNFZWtjTkowUUc1QTlTelN2bWRKT1FQbUpDYnd1MGVBZTVXOW8wMmxJQTdwcmQ4Sm5PZmx4RC9LT3lyMlFSb1RyK1JGTlUrWURSUEJjM21QSlVIZCtVZVkrWTlMN2xleDh4TFQ3RWQ3N1QraExSUmo1a1ovb2hxejd6UmxHcmZpai95SU4vbEU2ZkZCL3dER0RhUS8yODFQem1CWDNzcGRaMUVOWjZqVjlLRG0waWV4RVUrUkU3VjFjUmFWRGE3eVJReUQxTm04SU1rUnFMZFdFSnVIaUEwTDdJZFJZMHJXTk1mSWJpSXVZYmhpbDlaSFVxRUhVYVBFTUIyMTJRUHRtTm9sMlphcFpjUldEb1ZFRzdmQmJHeTF2akVzd1IzYitwWEE5RnI4UXEzcWk2bm1MOVFTMWZFbzdLNi90TWw1WG1VM2FGaEF0VnplTjZQaTB5NS9PV1MxckVUNW5neXpGTWU0RkE4YXl4dFo3WVdZazhTaFZCeHBLK3l1RkYrb2plTEtmOHd5VlZVTFltUi9BSXlCUEJjVHEycTFFY1ZiemFVa2ptbFJteWxjVFIzdm1KMmJhWmwwQXE2S3VYeTBhcGo1bE9qVnVkeGU4S1R0bHlyVzlJaUVXeVVCQ056MFpQQVdhZ2UydTh3T1Y1Qm1rdm15NHhhVVFUa3dyeGN1RXNMZjhVMGpld1FJYnp1cEFMUW5LdUIxdnNnczdQeHd5MjdNYzBlMk9tYnJUL01kRmZodytJRTVJR01HUnRaS1NIdWpldmJGL3FDQnJZUDVnZEFYZWtQRUNNZk15Um9CTDFLNytRZnlCT09MRUNWVnU5bStKckpJR1RjMWpRT0VQTjBiU3cxd3pHdnhGVlA0VFJIYk50d3NQSlR2YXNORmZta1BVeDRYL2ppTlBPZSs0NjVES1E0TG9BMWlFVWlXa0lVemcvY1F1ei95a2NWY3llWWhaMnJyQjh4R2haS0VSb01Eb01BZXZXR05pNTcwRE91VGF3Sm0xRDJnNmNHOHFJZmQ3c3lxQWJGbFN2YUt3cGhSYWFxMnFPYjBNd2ZnWEhiQUR0WnIyM0dPSFJJSHFHNUp6Y2RRSTRRYVBoRUZOeXlRTjJCczBXYTZsclltNDJTV3hrNS9ESVc1S1FrQkRsTW91ZWd1ZmlVMWhZcGozTk1LYXZ3aW13d1lERUMwMkZTcG9Bb0NzOFFVMTlVVHRsVEU1MEVIMW5pd1BjVVZOSVZLd2xHaVNmekE1UU9zd0xVcjFVc21sd3RxVHVmRUpCeEtOWUpxUWZhRXdtMWhuTGVXRmZPTVRwZmNScHZKbjJLSXZyNkdmVXd3V3dUNGluQW8vWkRaUTBGVnZxbVBTZFQ2ZHlCYmM0akNnT1VzTXBKMlp1ZDZTemx2VXRML0FMbjhHSEZ0Z2UxTU9QaXlKS20rQ3Y2ajYyZkxCYVUrZjhtNGx6UmwxbnppVjkwb052MmxnWHdoWml3SFFqZVE2RE5rTDRFelBrQk4wZncxMXlOSEgxRjlaYzlmbUwvM1FQVnZMTHV0L01LN1JCdFUwM1JMdXk5MVlwY1AzRmt1N1JjdERLMzlnUndGM3NQVXJjYmQ4OE51YmVzaHhIQThaSFY0WmdXSnBBamxzNU9PTHhhRVJ0M3NRRnZOb1ZsSkExSWxuNjlDRVlVMVhGUG1KSzJ0NWg1bTZDZ1dlR29ZN0tIUTg4eEd5TGIvQU5RM0FjRUlRS2JSUVRCVk1vS05RRGlpYTI0NGlBaHRxbEEwTTB5c3FFaFNWckJYSTYwWW1rbHdRR0RkRkptK3BYR0hPWWhCM3BHdzhZaWtuTGNhbUZLU0kvY3VDYTJMeEVqM1IrNGpOdDlOU3Q1YmU0RzVmVzZpazVjT0JSQWFLVFRRdmNXRjZidERoNG1hRytqZW9xcHJRUWNYS2xrRmF4OXdVd1pUSmxIWHVtNXN4d05FdkdJbk84VkhqQUh0eEs2VCtnQlpUQXVhTkVEWFQvMEp1Y25LM0JIUmJEcHpMOG15WGdQRXhhTGpKcm1EeldaZUpwdzZKZjVRd2FtOGdQVVJVWTV0QWxWUGhDbUp5cGdIUGFJY003amJmMlhMQ2t2a3pQSTVCWlR5ektnQkN3MGMydnRtQ1FCcnp6RW9SYXRTNkM0R0o1Wmd6UFpzRlJnYVdvV0VwbTBLSU1xSEtRbzV6ZFNHUTR5Ti91VTh2UktUNG5ENkNUWHVXYTExK3BSR08wSFI1ek5XNW9PUEdJbHJTelZ3VUp5U2lDV21nbmdtbmtvQkpaOEYzNk1vd1dqcWNXeTFTRk5iOTNFaTNtcXdmRVNiSkJLUzUwZXQ5MkZySnU2S2dOY0Nna29RZVFhekZscHlFdGFrU2xYRDZMa0hZU2h5NW16VVhPeXN0Umd0VzNkaGdMVkZ5MnFEY0NJeGVrN3BOV0JrQ1V4OVN6M0xFRGxjTFovTUpubXFDWXFUTGxncHdLTGhDa3VIQUlGUUhObTRzR2hwWmxiZWJEbG1ZNHdYNWk1cHkyc3JuVlNJUGNvVUF1ckR4Q21NZ3d2d2wreHpVUWMzRUdheEwrRWRYUEFJalZPaVllSmJoVm9rRU9iM1B1Z0VTeVgyUWlYVlNoQ0MwTzZpSUVJUjB1R3VzenNRY3JQaU53dDAwSHVIOFpOTDh3V01XVXI4Uy9TblpOdEMzTVUyZzYwbCtKZUw3bm1sM2FEYUVab1B4RnVrUnUrSXAxZkVWV0g0Z2hZL0VZbUZ2ajZtZlMrSVhWTTNSREdVUU82Y1pKelUzby9FTTZmVVc4eE54aWptTHhFTVZMMWtsOXl2d2NOcDR4aFpvUlJ0RmtETGJrczdTMHltbUs0alhiOEt4RVRYL0lqYUtmVlVIMUJycE4yWDNBdGp4LzVLeUM2VDdoamlOVUZsb2p0MWIzTEMxMnJtUEE3b214RS9RNHhkYjNLMFRXUnIrMFdVUlBpdEh6SFJEQ3dEb0loWkVVbDFVNWd4cVgyeHFNd1JXRDBUS0ZwMnJXVm96cWZLWGZPVC9TSktTRzV0NFlxNnZiNGdJVlRqQ2U0TEExaHJscVM5Vm9yNmlWcmNJUTZiMVozeE9oOFhJc3N3OXdSa08wMG1COFI5S0t3dU82WVZneUNqMVpHbkZnR25jVElXZE9naWFHSlowcThJdzNHd3FRZkdhVVNJalR6VEY5N0ZDV2Ryd0xwSlZyWlJ4MFJqU2pWQ2hNeHhtdUlla2pMRE5CNU1oZGF2UkUzK1VOVVc4YWt0d2JsWUlVZThPQTlrTnVlVE1mRUFnTFlBenpPY2xWSDBFZFFDNk9YaTJJWVcwdDhTeEVuWmFneEkxTVdCcmJ5STgwUzF1R0YyNHRpc0c3SDUxRXZXdUxnSHVPdGVTcGZpWk9aU1ZQekRGMXU2RFA2OVJ6Y2VoQTJ5TUNXZm1JV2JzbGZFTncrSUlZemVvSGFIakxNdnRJYlpIQ3dHSGpkWXRST0ZqREY4TEZ4UHBTMFEzRWU2eUpVMTZHSEhkeXZWeGJrZWVnN3FKMWx1ZkdJWlJmbDd6Q3pnMEw2eEVkZTZQbEVlNUZuNFlsUmRtVjJYeGNyTk9Dd3NZdVM3RWFEYmkxdW9panZtMGo3ajlxRjFQbU5kd0J6M1JFS081RSs0VFM5Sy9zbHFNM1pVdVRlbW1GRDducVVRRzBzUHpDZDYxYnZxRWRLTWFGY3htdk1JR3c3d0xJb2FRd0x0ZjA1Z3cxdUVaYUcrdERCTmVoUDFQTXc1UmZBNTJqUi8xVG5OY3g5dU5CYmVvdGcrUTJPV3BlVTJVRFFNYUhQSlZ1QzJRUDhBcUphaHRhQy9NRVBEL3dBVkRYT1dIVmdNbzd3TEl6Zi9BS2pUTU0zZ2J3UlkydUNBK1l2UUdCbVBjSWtPaFY5VDJjR25zaXhtMXgvTW9QMk5oRDF0ekd1c3k5dnJZKzZCRUZWVTN1QnJHVEM0dUVpdllqRjZseDVBVzVjcXh5WVJFMU9ZT2laV1ZCSWdXcytrR3Q4Q3RBdVAzOWdvZ1lZYkZqNWdGWTBRYm5BWEt1WnBNOUtuSUVZYWpETmNlU1AxZzBENW1JNnZ0WmZxM3d3dFU4RkZVSUt2UkF6THdMSVBaS0MwT2lXMFhTRkxUL2hzZmNqVUpISUgzVVRkUGpsK2F6ajRadS9oZzlQZ2dONzFMdFBpaUw2b1RMcjNWeDN3N1ZFUzFKeVpuSVppcHEzTjVBTm9YY0MrQ0xGa1BLcWRUSUc0WkFXY2pjNEZTaVNoQTRuVE05cDRzV3pwWkdaOXpwa2hENElvWk5MZzlzVzMyby93cHlIMXBmY3d4bXRJUjlBamkxSmhnT3Iwdk1xbDdDMjNDVDdKb1VnV3JWcUVoNmtCbVpFcTd4ZDBMVkRFQTRUR0hNeWZ6b0NFaGZXMUN4czB0TXhNcXNFdUt6bVIyL3pMVm9zalpBdE1OZFQ0anBSMVlyNXFCK0dLRCtiQVlLWVVKcDVKWlI4RU03MXlFZjE1aEFWNVk1QnNzMmVkSlFpdExnZXB6RktnZWlGckFEb2pHbHNTbGptWStaRlZyQmxKS3RMV0ZOdHJZZTJ6TXZ4UG05ZFhpSU1WeXZ5UUNlMWgwZGtyZ0x1TTZqb3BFRDJpTXRkVDlIZHhvYTJYMzNwSytYMEszcldQNDZrMlBLeHR1by80Smg4SW80WTRQaGZCY3VXd3V5ZzBvOG42dnhodm5PK2xKaXc1UEFzSTlKVTlYSzRLNHEvSUZ3anVlRFBURU5UYUp4N01RVnNrSXYzY3UzeXArK1hBUFU0dllUTWhiNCtsaXdtMHY4d2dLcTdqZjNFeW02MDFYY3Jhb3RpVGt3eWh4RlNzRm5aTGh4b08xREtnem1zajlNN28vQ3hLTGFtTDJUTGVZK2tyanI2OVlQbTVsUDhBVnRieGNxbFFzQVB1Q1doNFg4R2VjdHVaZUFOUnBCSkpsTzl4TGJPaFVJclpkdXBiOXdnVTZPZzlSSzdYUlY5UXloVGk1bWljck1BTHhUTGtEMnFKVnpWZ1FVbzMzbVBSVWpwTG5qTnd5azl0TXk1Qy93QmhBemZ2a2xVTGNxb21teTd4bFZGajV4NUYxSmhRcU1jSkxOZVpUc0dyMzhJVGFlbEt0eEVUbGpJREFwcWJxWmw0QjJoL014Z2ZOazBWdXdBOVhLWmZvWnA3ampkdGo4R0NaWTJLK0pzM2JXSHFITWN3bC9FejROdTE4M0hPVzd0RlJNdDJFckVxQnRBWGNROFhwYnkzUjJqUkxRT3FSUDhBWVdTTmdOZkpCY1lwWEI3amJvYWlvUHFYQlYvMGFVWGhvQW5tVzNwZHVERXJSVlRrOXhBaU43azl3MFVQRXhBSnlENWl6djhBY2VhaWFSYjRyM0tjNUt5NElwcWNrRUlUMkdDQW1iS1JqSUJiZWE4em5vakw5SS80WUkvRndSZmFBZ1BxYmdQOFF2bjkybUNBTzAvb0VvMXB2L3lsZ1Q3WktpL0VOL3FHbkxSUWJzZVFqaFh0ZVNYKzc2ZHZ1RXJYZXIrRURMcDVzUW1PZGhVUk5meS9yRFVzSElEN1k2N2xuR0t1SlJHM0NickxiQ2Q4ODNNdi9KWUhuY3Q5eTBSY2h2N2lkSWVFSDl3QVBXYkgrWTRBOFViOGtmbzIwVWI4eXlQYkFQcGxpTk5MYWhxVzFCQzVoM1UvaG5YSFA5SmFsZW12NGhKUGJkR0RBMDFiTitab2dQTXdXWGVCTS96b014MjdwZFpvam03WStZb09GS1BxZHhnVGIxY3UyZ0Znd2xxR3RGK0lPSFpCWHd3QXNHcVZQaVdPUi9UaUl0cm5lR3RrYlhJM1hhR2dScnppdy9FVTVSdlZadS83VUFsNXV4SzZCdXR3RUVDcWhnUjRnUmo1NTBBQm9pMWlFekE1ZTFsakw0WlFvTnlxWGpvQXpCN1pOZHNUWFQ1YWFtUGlLMmozSEViaHRvY1prWVd2Y0toWUNydk5Sd05sWlZlQ1doaHUrRi9NSFpGWkxQTWFrTmlqY0krNU9hc1RBTzRCRzRzcTJWd3hqQ1pFUGF2U2xIUWMxa0JBcUhNR2ZtRGN4aE0xSWJlanc1amUyWGdsT1VNbzl4ZXRSRVVsN1VPRThwQ3hidEF2akJMYTUwRjVNeGVEV2lmakVxaE9LcnRLeEcwVHY0aEZqUXNFTFEzblRYR2NRbFRFbCs0K011S1NSbFEzQUdrSlZOTUJVK0llUXF3S3A3Z2d2dldIbHFaNExBclQwd2dMNmJtQjlOcTdRaWh6aWw3akI1S3N2OHhuZ3JvNlRFZENaN1RUTlhyNG9pK3JmTGNIVjd2L0FJUURJT3dQdUlFeTNjTUUwM2hzb3JyN2FKMUp2VkxJRHFrT29iaHpIZ241a2JydlloOHdvaHJGaytJSEV6QWErZFl0d3VVeGFxWmV1TTI0cEtQM0U3SzMvSVUvOGp5NUxnV3J2bHZNeGhpcnY0WEZPYmRHUEl5bkxZVDdSbzhzRUNXODhOQXZ6RGlScVhmM0FXYzhHeVdLSjRJdU9MSU9peUsyQzkxTE1MWG1PdUh6S01RZG1FakF5Rk1kTnV3V1Jkb25jVWhoSWlnT1F3TWNpUnZEbzJseW9EbEdoaEUrQnJJYVYyeVE4U09Dc3RVQThwaFZIQmNhYUJ1WGcxNzJMRW1FTG1jMTVxVVhWeEZlYWhMUlEzSDFFZDhKUkdIa1IzYWxVRzZBTC9NZmdqeWpTVm5MaTlCdUVxVWpUMk9qOHdkbjgxZnd3TzcxSmZpSzNaTEg4aEVqb3N0YWRTNXVKYU5QYW9qUmU5SXJwNGxxcHIweFlCTTAwL0pGVGpxKzFFUVlZUVFyVDdXa0N5M1pqNU1nWUY5aEZpMnpnV29FaVhseWpxak5sWHhLSUhpaG1jQ3U4MnlrQWdXbGlabERsMHdVVk9MUTZzYnUxaVJWWG1vbDBYVE01OGdoNEt1MHFpajl0UW9nS0dEN0loU3hhM3JCbHE4SGtnZ004RnNtUE9yVXV1SElWTzBzbVh2YXlBRmMycGxqaUVQSjR5WW1ZZW1SbGJQTlNmM2RtYWYzeGhWK0lHYlcrdFJGcVhsTXk5YlpwU0QxRGpUMEMreU14d29hWHdTdDdYTjBhOHptQ3lIMnpFdTlWL3hBU3hWaVJYRUVzRm53c1psVGhUL01VYkhTditJMWk4NXhkdk9tekRvSjRyODUzTG9rS3B2QXR4U1BhVFllNXBBT2FHNm1QNGh6Skx6dDlyK0k0dGx4L2pGMS9TK0ljWFhFamhrWTEvU2tybWFiQlVOY2FieThFbm9pYlZ2aU5ObjVZT1lYdFlCcEJ2dWxVdzZYRDRuQ1JDd05aaUdpTVZXVDVtU25lYmRSa2dhNUcyTVZwdFkvRTZ6WDdCSnFwVXlJN1p2aU1YeExMMTMrcDZtZUNlVEV2VjNVd0I0Sm1HU0Y5SlQ5Rm00aUhUZ3BUWG1Qa3pOSno5d1l0VmFYTjlDMXpLaG5Mc1RJVFZ0cEJvODZ5ekJpWkRSanpyT09qQjhzd255Njc0TnB4aG1LcnkzZ2Jjc2Z3RE1kRHUycjdqWUx5Ujhzb3pHdzZmRTA3SElvUnR6WlVQb2RvbldZSXJuTERGSjAyTzVVM0dnQjdJU2RuZWp1S2wrWWY2UUZtMnZOcXZ1S0xheFNqZ0lMQkNqeEIycGlVUWZFU3FWNFZDYXg3TWFuQ2ZRUVF1QVI0WWFZcUtGT3NSTkRhbVpGanpscFJCTEdWc0d1Z2h6QUtYOXN5YkVWN2ptS3pQTlMzbTQrWmU0UGNhMnVZL1dmdytRMTBqdUZOYkh1STZ3TEF3WG1aNzJVR0tDNy93REdZUTNXWVMwajFqSHRoS28zUGJNaEx2VlBVTEwxQ3ZzcWE1THFOZTRCVXM0cmhtcUdFYWtnOS91YllmTS83aUQvQU81LzZVUWY2aHVrSHNUZjVyNmU0YWtIWk5YM2tTM3ZYMW1xSytrWXRmeVlGVk53ekNMOVlpM2I0QkxyM3VJc1Q3UDlNbzF2dUV1MWwzTStOTXk1UE9YRXBveG9TQXZpRERGNUpHRGc2Q3N0UmRxakZBZUlycDhJK1FEb1I3cnJ6aEExeGxLUDZ1TVFXenVGTUNkZHhvaXF4NmkrSTdDamFiUEZVcGJ5TlJ3OGw1ZkZZRGlxN3hHVjVxYTVjT2toUUFJbWFUVTNaZ3IzbkVBSmRHbys1OHgwUDVqV0VtcGJMbjNjMVd2TmswbnFJUWVvUjBXVnpGQTJDQU5CVjRnNnMxcTRubU9jc0pkbmJIcnRqUFpJSFRjOHhJYXVZNlVkbUlLa2dMNUNYQ1VlUmpwcTc0WWc3R0tieDFTZTR5anRIa1JxK3NtdXAybzQydlpMZTEwd2wzQkFsaDhvd3E0NGg3ZHJtRTc3QjVzZlF3SVVSeWUzdGpRU2F2VDBJekg2dXQ3Z1JnTTIwblRYTC9hTkpSdS8zRDZibkJQd3dNa3VlVVZBOGovTXRsOUNWeXFMbWlRbDJmY3JCNGh4Uk1PT3JtZlAxUmp0ZmFHR2s4RUliODdMN0w1bHRzK0NJOTcxTnVIVVZ2OEF3Y3hyWm05dTRucFljR0lMZDNiMndvNUxsZEVlaU9aRjdqVnFubGxCMldNekQ4azBMeVdRUm04VlJ5L093ZU1kdHJmRUlGcDNXSGtrM1ZtUzZLN3p1RUsyQmMrVUVQMmx4WmFFTTFQdW5jQ2lYNUpvRHRRb0RtcG9UNXhtSFhxNmZFeC9EWmp1S2VXcFU2SGhBRkE5bGxsZjh3SXhwQklwSG1GdGRpTlpCYThSaTBOS3VrUzJjSy9DTm56MWJLVkwzeldKcWgwb21UTlhxelhITkN3am1PMHdFRjBQa1p0Q2lYT0h5eSt6WFJNSCtvQlJQVVZzSGtaVFpuNGdCdEJlR0RoQjNsS3hzZ3h2bjFFRFhYekhYSlVlcWo0WEVhWDR3bmpKNWlwdlVxOTVYa09vTlpyRmdNUFV2NGV4TlFlMHMweXI3OGd5cHcrNHZwVzBQQkR4aGwrUitLWXlpOEdVSGgxUmlKaFlsMWsrcFlFelRjcFhZNFl2N2dtSFE4aU9xK3kwUGlFUUlxME10UWh5Tmdnd1RtZFU4eTdnYUpzZnZSQ1JvTXBhcHJRdFh6bk1QVEdDQkNtemNxcS90Qk5uekFLL213eXNmbUVhbDl3TGI4d0hENWdOQitaYm9QbUM2bjVnMW8rWURxUG1EeCtaL3dDN09EN1Q5N0RQOXdZd0padWZNU1pwTzVxdGZFWFVrMkYvWWxsWjlRL3BxVTFJVThqRGxvK0k3bFYxRkhISmQwU0ovd0FwbWhJOXk0enJ6T0ErNGd6NUwvTlhLUlNUaENRNTh4cS9KUzFBanBaWVEzWTQ0eG5ldEhMczN1bk11WEhXeFVTTnNuZXBaS09pSTJqT2xReW53T09LcWxzYmd0NzZDb2xtRzY0MzZEaTRCTEhkeXNwOXpjQ1dOUDNNak4rNEJ4OXlrWVBNSlg3VWRWa2R3QitKYytWQWw5amVHT0ttT291NWNRdTR1NnZjMzFzWHkvTTVJOElzMFU5eFBUNW9ocVBCSGFuMU5HdTh5L2VScDBoMDBQaGc5TDhzZUY4RUJkYjlFb2h2RFQrSS9iMzd0M002c2J2RkRXUGUwQ0J6WkpLMElPMWNjVXFkek9ZNWZkd0RKL0NBY3g3aXFDSmQwckc2TGZFczZyWVpjQTNXQktpZFZEcUM2aUExekJUSXpCTjdUcWNrZTRyMGNFVXMzTDV3eHk1bXBtWFVLNlFQRTVtZUhtbUd6WEJwT1VQSmdIOUJDYzBCeXFoL1pWOXdzVkhUK0NKZGZTMEEvS01zMG10djhYVU5vT2dJbzJxU2pxZkNMRlRTWmNwZWNFYU9zejBQaWI3RHRnYkM5M0EwZVdIa3pBRkZ2cmw1U2RySzM0czFGTWgyc0hvQWwzZCtaM21tTmpMS05GeXhwQWczVmVKZmNsbXpjRmFYY1d0SnF3d0NBeFNlSUNaeEtVWGtZZVVScEZLeVJKOURMWjVCTEYwRGZjbzdZMmIvQUJLWXJzdVdZbDBnZHNPUkw4UjRNVEtXUEJFd0hJUTJxUHVFNmJ5am9LN2o3aUNxSHFNTDl2RFV1SjhUTXJmS2hFZ3RaN0VnRlk4dXZ6TTJwMFhCR3ZyaVdLT01rb2g5dm5Wc1M2Ty9Dek5GT0V2c2RSRXVjNVVnM21Ic21UTmFWVDl4d3AvbStZSzJxeTFMbXcwYjQzb1JpOUpCNkk4c2tYZzZXWDJQbVA4QTZKWm8vbU1aWHpIUS90TFF2N3dNZjNnUCs0VC9BTGd2KzRYL0FMZy8rNGE3L2NGMCs4TGI3UzcvQUtnTmYyanR2ekRqL00zWStZclIrWWdVKzhBejk1di9BTHkyMTE1aUxZNlphZ3o2aVhkNGpGMFBESEYxZHN4YVB5SldXUThYSHpiU0Y4Sk9TNWVPdklidjdnTUNEZ3VIamRHNm1NTHlMRnNqREdoNE1Ya3VGdzlRTzNyWElkY0xlUmlBUWlsdExPRjNpTlBBZkNNNTJVQ1BGVHBocGhaTzdpSTMrV0lGZkJsM2RvcTZkK1oyeTh4RFNuVWZkZ3V2M0hXSDdpNjROYzVpQnFuQ3kveU9TQlpZeXpTZkV1dzhNS0dXRkxpN2hXV3ZVTkZ1c1JpZTRvbDJYZXRrclo4NDI2RExHdHhEc3NweWsxTko1bXdIaUpvcm1YTjNIakZHdHhCZ05nOWlXSURlVnhBcjV5YnBMMUVZdjRRMWNST2JoMklCdU1lQlVzbmFkSTlwYWZ6TFhlRE1JQTBDY2xwdEU4elpoOFRnZk1WM3J4SFdsOHY0cHJPa0VEUDR0dlJaYkt4Szl5dVNVY1NxNElqd1kxU3JNNTl3SzJoU1hjYzZZbERFSEVycXBYNEZ4Y3hhcWpYVWdjUUI4d211U1U0aEVMOFF5TzgzYVJ0N2VaaXJlcmhHTitBWGoxNnBTUml3SG5VUjcyZ3l0ai9hZFJhaGpZT2RpeEZTbUZGM0dEbGJ3elVlSmhpazRoeUNOdUdjdytvQmZsVEFnN3BzQUhVT3NxUkE1L0Z5MHZ2QktWT3BRVDdsUGlIVjE4Wjl3V21EbHpHTDVORk10L1JWRUNhcmtLbVdDN01RNTBSNjdIZVo4aGd3c3crVWxWcW8yODE2Z1VRYk1XQmEzU1ZOdGRoUDVISUcvd0I1cmtnbG1Cc01RMHdGL3dDb3pSOTV0Yis0eVA3U2dYOXBTS1BtRjJmTWRzZmNJLzNIRXA4d0RwOTQzei9LTGFmL0FFWm0vc2dOQm1GMlpmY1NPWTh5eGZSaDNwSGMzMTh4c3RvN2o0V25jRm9SZ2JUbnVXdEQ3aEZBaVhLQmRTMWJwWWhYekNxcmVZNWxtRUQzTmF3NW51cXNJa0crSU5VZkNPNmhOQW9pT3JETER3bHcvd0JMZ0JGRHNpT3A1NHhBSkJ2OVlsVVdaUnd0VFhzWmRNckxUREVyT1lmTXNid0dqRjFNeUFId3pwL21hMFdtUERFbWs3VkJmSThHNE1ZeEdWbU1OQmU1aVBoUDdpWmYydVFudzdqU0xqYnRBYng5eTRaWnF5ekJWaWVJNEZwNUlneVg0SVM0aHd3eG5tQy8rd05nWmV6NW9nYkhtVlhMOUVWR3V1NDhvTWFpWHBQU1dOWlVwZEoybDlwWnRVT2I4VG9mYzRLUEdZbDdzQWFzUldQNGxEcEtPOHR4SGxNRXVWYzhKamo4WlE0eGN3M2lFcnI2bHRqNmltS0c4bzh6Qm9TM3FwVjYvZ3JpV2VYOFZEU3BteVZNMVdhZzVORWFhMEhjVHlQaVVHNktxc3ZCRE1FT1dIR0k2SUdjblVJTmkyaEV0ZFk5eXdSUGtRUzQ4a3ZBTHdRcEtIUlltc0R5cGZFTFV2VlFoaTg4ck12Qk0xMG95a1hvbXAxUFVkVXhUV0k4c0FHckZoUUI2bWJLb0w0TThWT1pIdVZLc1MrWXhkeEwvSmJtQzVpdC93Q0lHb0Y2WmdKcEhrekpDanBtZ0tmYzlxUWs4UU1VUGNjTmxoYVphMzRWa3ZFNXNoRk1vU252ZVk4eTRyL3hnRFMza1pvcDhzRDBTVllQcG0rR2JSd1J5dm1KV1A1bWx1YUk1bzdZdnVpbXY1bXBMNWxISjh6Y0VxY2ZOQnVYOHdYSm51SUhMNW1nTDVsbkh5UmMva2owdGZjVTVETmUvcUQ2WjhNcVpqek5YR0lPU2JKZTV0MmpzV3BLTnRWZzFpSzRVTllBVjlrei93Q3dGeWhGT2pVYTYzUEovTkYzbFRlVW5DczVFcVlXTHpjVTdwYm01YzNuZFpvMWd1MGVFWEJjeE5DSWY5S1o2cWVjZENIYVlsNnd6VkU5UVppZDFUaUlHQ29nZjlsRzMzT0NLM1k5cGxQTU1iOUVvMVlmbUNta0dVZ1U0Z1VnRGs5UVpsUmJqZ2xmZ0RXVktsUUIyaUFZSmFhUzRabFJ4RngrTUpmaVhCekhXb2xTc1FMektsUU1ReEZ6VXFNV3RJc3VMbUpjY1NvNE1RenJCQW9zaW1YRFhRbXh4RlFGTHVlVDVoaXdsNk5vdHhDK3ByK0hCQ1F4YUFZSnFNR05aWTJxcGgvdUpWZWlBOVZ1SXF0RTZYQlptTTBRWXkwOXBka1ZOcnhIWkFIUkNUVVUwaXJnRmFSVTBnMXBxSVhwRlljV1l0QStJVkFZalJ4QXVPSWFmbmFZNlZNblA0U0R0REdrV2M1bVJMZVlYQ1JOeG5wWXFsTGNUUVJqdEszRExlWGZtY0pVbzNDVk5JRTBuUllPaVhibW9DVjVsdERFZUpaRlJWL2hhL0M1YnpCUURSWWNrdHpEbUtuRU5BL2hoR3FBNUlHT2ZNYlJSRzViRkxyRmZoNWlXVzFFdXNWeTJJcUt2OExtc1Zzd1lvZ3NHeVhVVmx4UlpHV0tncjFpNWVXNWxvcW91TGVzV3dEUmc1WWFnMktuWkx1ckZCVWRXUFJSOFFCUUJpeGNXNDZTb1B4b2dyaGx5RVRsZ2F5cWx6Ly8yUT09Iik7LS1iZzojMDUwYzEzOy0tcGFuZWw6IzBiMTQxZTstLXBhbmVsMjojMGUxOTI0Oy0tYm9yZGVyOiMyNjM3NDY7LS1tdXRlZDojOTFhMGFmOy0tdGV4dDojZWRmMmY4Oy0tZ3JlZW46IzQ5ZTVhODstLWdyZWVuMjojMjhjOTgxOy0tcmluZzojMzQ0NTU1fQoqe2JveC1zaXppbmc6Ym9yZGVyLWJveH0KYm9keXttYXJnaW46MDtiYWNrZ3JvdW5kOiMwNTBjMTM7Y29sb3I6dmFyKC0tdGV4dCk7Zm9udC1mYW1pbHk6SW50ZXIsdWktc2Fucy1zZXJpZixzeXN0ZW0tdWksLWFwcGxlLXN5c3RlbSwiU2Vnb2UgVUkiLHNhbnMtc2VyaWY7cGFkZGluZzowfQouZGFzaGJvYXJke21heC13aWR0aDpub25lO3dpZHRoOjEwMCU7bWFyZ2luOjA7YmFja2dyb3VuZDpyYWRpYWwtZ3JhZGllbnQoZWxsaXBzZSBhdCA3NSUgMCUsIzExMWQyYiAwJSx0cmFuc3BhcmVudCAzNCUpLGxpbmVhci1ncmFkaWVudCgxNDVkZWcsIzA4MTExYSwjMDMwOTEwIDcyJSk7cGFkZGluZzoyNHB4IDI2cHggMzBweDttaW4taGVpZ2h0OjEwMHZoO2JveC1zaGFkb3c6bm9uZX0KLmJyYW5ke2hlaWdodDozNnB4O2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjEycHg7bWFyZ2luOjAgMCAxNnB4IDhweDtjb2xvcjojZjRmN2ZifQoubG9nb3t3aWR0aDozNHB4O2hlaWdodDozMHB4O3Bvc2l0aW9uOnJlbGF0aXZlO2Rpc3BsYXk6aW5saW5lLWJsb2NrfQoubG9nbzpiZWZvcmUsLmxvZ286YWZ0ZXJ7Y29udGVudDoiIjtwb3NpdGlvbjphYnNvbHV0ZTtib3R0b206MnB4O2JvcmRlci1sZWZ0OjE1cHggc29saWQgdHJhbnNwYXJlbnQ7Ym9yZGVyLXJpZ2h0OjE1cHggc29saWQgdHJhbnNwYXJlbnQ7Ym9yZGVyLWJvdHRvbToyNXB4IHNvbGlkICNlOWYwZjd9Ci5sb2dvOmFmdGVye2xlZnQ6MTNweDtib3R0b206MnB4O2JvcmRlci1sZWZ0LXdpZHRoOjlweDtib3JkZXItcmlnaHQtd2lkdGg6OXB4O2JvcmRlci1ib3R0b20td2lkdGg6MTZweDtib3JkZXItYm90dG9tLWNvbG9yOiNhZWJkY2V9Ci5icmFuZC1uYW1le2ZvbnQtc2l6ZToxMXB4O2ZvbnQtd2VpZ2h0Ojc1MDtsZXR0ZXItc3BhY2luZzoxLjZweDtsaW5lLWhlaWdodDoxLjJ9LmJyYW5kLXZlcnNpb257Zm9udC1zaXplOjEwcHg7Y29sb3I6IzlhYTliODttYXJnaW4tdG9wOjNweH0KLnBhbmVse2JhY2tncm91bmQ6bGluZWFyLWdyYWRpZW50KDE0NWRlZyxyZ2JhKDE3LDI5LDQyLC45NikscmdiYSg4LDE2LDI1LC45NykpO2JvcmRlcjoxcHggc29saWQgdmFyKC0tYm9yZGVyKTtib3JkZXItcmFkaXVzOjE0cHg7b3ZlcmZsb3c6aGlkZGVufQouaGVyb3toZWlnaHQ6MjQ0cHg7cG9zaXRpb246cmVsYXRpdmU7bWFyZ2luLWJvdHRvbToxNnB4O2JhY2tncm91bmQtaW1hZ2U6dmFyKC0taGVyby1sYXllcmVkLWJnKTtiYWNrZ3JvdW5kLXNpemU6Y292ZXI7YmFja2dyb3VuZC1wb3NpdGlvbjpjZW50ZXIgNDglfQouaGVyby10b3B7aGVpZ2h0OjE2MHB4O2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpmbGV4LXN0YXJ0O3BhZGRpbmc6MjJweCAzMHB4O2dhcDoxOHB4O3Bvc2l0aW9uOnJlbGF0aXZlO3otaW5kZXg6MX0KLmRhdGUtcXVvdGV7bWluLXdpZHRoOjA7ZmxleDoxO3BhZGRpbmctdG9wOjA7dGV4dC1hbGlnbjpjZW50ZXJ9Ci5kYXRlLXRpdGxle2ZvbnQtZmFtaWx5Okdlb3JnaWEsIlRpbWVzIE5ldyBSb21hbiIsc2VyaWY7Zm9udC13ZWlnaHQ6NjAwO2ZvbnQtc2l6ZTpjbGFtcCgyN3B4LDN2dyw0M3B4KTtsZXR0ZXItc3BhY2luZzotLjhweDtsaW5lLWhlaWdodDoxLjEyO3RleHQtc2hhZG93OjAgMnB4IDEycHggIzAwMDh9Ci5xdW90ZXtmb250LWZhbWlseTpHZW9yZ2lhLCJUaW1lcyBOZXcgUm9tYW4iLHNlcmlmO2ZvbnQtc2l6ZTpjbGFtcCgxNHB4LDEuMzV2dywxOXB4KTttYXJnaW4tdG9wOjEzcHg7dGV4dC1zaGFkb3c6MCAycHggMTBweCAjMDAwYn0KLmF1dGhvcntmb250LWZhbWlseTpHZW9yZ2lhLCJUaW1lcyBOZXcgUm9tYW4iLHNlcmlmO2ZvbnQtc2l6ZToxNHB4O21hcmdpbi10b3A6N3B4O2NvbG9yOiNkN2UwZTh9Ci5jbG9jay1hcmVhe2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjIycHg7cGFkZGluZzo0cHggMCAwIDIwcHg7bWFyZ2luLWxlZnQ6YXV0b30KLmRpZ2l0YWx7Zm9udC1zaXplOmNsYW1wKDI1cHgsMi44dncsMzlweCk7Zm9udC13ZWlnaHQ6NTUwO2xldHRlci1zcGFjaW5nOi4zcHg7d2hpdGUtc3BhY2U6bm93cmFwO2ZvbnQtdmFyaWFudC1udW1lcmljOnRhYnVsYXItbnVtc30KLmRpZ2l0YWwgLnNlY29uZHN7Zm9udC1zaXplOi42MmVtO2ZvbnQtd2VpZ2h0OjUwMDtsZXR0ZXItc3BhY2luZzowO21hcmdpbi1sZWZ0OjJweDtvcGFjaXR5Oi45fS5kaWdpdGFsIHNtYWxse2ZvbnQtc2l6ZTouNDJlbTtmb250LXdlaWdodDo1MDA7bGV0dGVyLXNwYWNpbmc6LjhweDttYXJnaW4tbGVmdDoycHh9Ci5jbG9jay1kaXZpZGVye2hlaWdodDo3MnB4O3dpZHRoOjFweDtiYWNrZ3JvdW5kOiM3NTg1OTY1NX0KLmFuYWxvZ3t3aWR0aDoxMDBweDtoZWlnaHQ6MTAwcHg7ZmxleDpub25lO2ZpbHRlcjpkcm9wLXNoYWRvdygwIDAgOHB4ICMwMDA4KX0KLnRpbWVsaW5le3Bvc2l0aW9uOmFic29sdXRlO2xlZnQ6NC41JTtyaWdodDo0LjUlO2JvdHRvbToyMnB4O2hlaWdodDo0MnB4O3otaW5kZXg6Mn0KLnRyYWNre3Bvc2l0aW9uOmFic29sdXRlO2xlZnQ6MDtyaWdodDowO3RvcDo3cHg7aGVpZ2h0OjNweDtib3JkZXItcmFkaXVzOjk5cHg7YmFja2dyb3VuZDpsaW5lYXItZ3JhZGllbnQoOTBkZWcsdmFyKC0tZ3JlZW4pLCNiNGMwYzkpO2JveC1zaGFkb3c6MCAwIDhweCAjNDRlM2E0NjZ9Ci50cmFjay1maWxse3Bvc2l0aW9uOmFic29sdXRlO2xlZnQ6MDt0b3A6N3B4O2hlaWdodDozcHg7d2lkdGg6MDtiYWNrZ3JvdW5kOmxpbmVhci1ncmFkaWVudCg5MGRlZywjNDJlNmE1LCM4ZmZmZDApO2JvcmRlci1yYWRpdXM6OTlweDtib3gtc2hhZG93OjAgMCA4cHggIzQ5ZTVhODY2fQoubWFya2Vye3Bvc2l0aW9uOmFic29sdXRlO3RvcDoycHg7d2lkdGg6MTNweDtoZWlnaHQ6MTNweDtib3JkZXItcmFkaXVzOjUwJTt0cmFuc2Zvcm06dHJhbnNsYXRlWCgtNTAlKTtiYWNrZ3JvdW5kOiNkY2U1ZWQ7Ym9yZGVyOjJweCBzb2xpZCAjZGNlNWVkO3otaW5kZXg6Mn0KLm1hcmtlci5kb25le2JhY2tncm91bmQ6IzI4ZDk5NTtib3JkZXItY29sb3I6I2Q2ZmZmMH0KLm1hcmtlci5zdGFydCwubWFya2VyLmVuZHt3aWR0aDoxMnB4O2hlaWdodDoxMnB4O3RvcDoyLjVweDtiYWNrZ3JvdW5kOiMwODEzMWM7Ym9yZGVyOjJweCBzb2xpZCAjYzZkMmRmfQouY3VycmVudC1kb3R7cG9zaXRpb246YWJzb2x1dGU7dG9wOjA7d2lkdGg6MTdweDtoZWlnaHQ6MTdweDtib3JkZXItcmFkaXVzOjUwJTt0cmFuc2Zvcm06dHJhbnNsYXRlKC01MCUsLTJweCk7YmFja2dyb3VuZDojNTRmMGIxO2JvcmRlcjoycHggc29saWQgI2Q2ZmZmMDtib3gtc2hhZG93OjAgMCA3cHggM3B4ICM0OGU3YWQ5OSwwIDAgMThweCA1cHggIzM1ZDk5NTY2O3otaW5kZXg6M30KLnRpY2stbGFiZWx7cG9zaXRpb246YWJzb2x1dGU7dG9wOjI4cHg7dHJhbnNmb3JtOnRyYW5zbGF0ZVgoLTUwJSk7Zm9udC1zaXplOjEwcHg7bGV0dGVyLXNwYWNpbmc6LjE1cHg7Y29sb3I6IzlhYThiNTt3aGl0ZS1zcGFjZTpub3dyYXA7b3BhY2l0eTouODJ9Ci50aWNrLWxhYmVsLmVkZ2UtbGVmdHt0cmFuc2Zvcm06bm9uZX0udGljay1sYWJlbC5lZGdlLXJpZ2h0e3RyYW5zZm9ybTp0cmFuc2xhdGVYKC0xMDAlKX0KLnNlY3Rpb24td2Vla3toZWlnaHQ6MTEwcHg7bWFyZ2luLWJvdHRvbToxNnB4O2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7cGFkZGluZzoxNXB4IDI4cHg7cG9zaXRpb246cmVsYXRpdmV9Ci5zZWN0aW9uLWhlYWRpbmd7Zm9udC1zaXplOmNsYW1wKDIxcHgsMi4xdncsMjlweCk7Zm9udC13ZWlnaHQ6NjUwO3doaXRlLXNwYWNlOm5vd3JhcDtsZXR0ZXItc3BhY2luZzotLjVweH0KLndlZWstZGF5c3tkaXNwbGF5OmdyaWQ7Z3JpZC10ZW1wbGF0ZS1jb2x1bW5zOnJlcGVhdCg3LG1pbm1heCg0OHB4LDFmcikpO2dhcDpjbGFtcCgxMHB4LDN2dyw0OHB4KTtwb3NpdGlvbjphYnNvbHV0ZTtsZWZ0OjUwJTt0cmFuc2Zvcm06dHJhbnNsYXRlWCgtNTAlKTt3aWR0aDptaW4oNjglLDkwMHB4KTthbGlnbi1pdGVtczpjZW50ZXJ9Ci5kYXktaXRlbSwubW9udGgtaXRlbSwueWVhci1pdGVte2Rpc3BsYXk6ZmxleDtmbGV4LWRpcmVjdGlvbjpjb2x1bW47YWxpZ24taXRlbXM6Y2VudGVyO2p1c3RpZnktY29udGVudDpjZW50ZXI7Z2FwOjZweDttaW4td2lkdGg6MH0KLnByb2dyZXNzLXJpbmd7d2lkdGg6NDJweDtoZWlnaHQ6NDJweDttaW4td2lkdGg6NDJweDttaW4taGVpZ2h0OjQycHg7ZmxleDowIDAgNDJweDthc3BlY3QtcmF0aW86MTtib3JkZXItcmFkaXVzOjUwJTtib3JkZXI6M3B4IHNvbGlkIHZhcigtLXJpbmcpO2Rpc3BsYXk6Z3JpZDtwbGFjZS1pdGVtczpjZW50ZXI7Y3Vyc29yOnBvaW50ZXI7cG9zaXRpb246cmVsYXRpdmU7YmFja2dyb3VuZDp0cmFuc3BhcmVudDt0cmFuc2l0aW9uOnRyYW5zZm9ybSAuMTVzLGJvcmRlci1jb2xvciAuMTVzfQoucHJvZ3Jlc3MtcmluZzpob3Zlcnt0cmFuc2Zvcm06c2NhbGUoMS4wNik7Ym9yZGVyLWNvbG9yOiM2NjgwOTZ9Ci5wcm9ncmVzcy1yaW5nLmNvbXBsZXRle2JhY2tncm91bmQ6bGluZWFyLWdyYWRpZW50KDE0NWRlZywjMjM4ZDU4LCMxNzZjNDkpO2JvcmRlci1jb2xvcjojMjE4YjViO2NvbG9yOiNhOWZmZGN9Ci5wcm9ncmVzcy1yaW5nLmNvbXBsZXRlOmFmdGVye2NvbnRlbnQ6IuKckyI7Zm9udC1zaXplOjIzcHg7Zm9udC13ZWlnaHQ6NzAwO2xpbmUtaGVpZ2h0OjE7Y29sb3I6I2E3ZmZkYn0KLnByb2dyZXNzLXJpbmcuY3VycmVudHtib3JkZXI6MDtiYWNrZ3JvdW5kOmNvbmljLWdyYWRpZW50KCM1OWVmYjYgY2FsYyh2YXIoLS1wcm9ncmVzcywgMCkqMSUpLCMyYjNiNGIgMCk7dHJhbnNmb3JtOm5vbmU7fQoucHJvZ3Jlc3MtcmluZy5jdXJyZW50OmJlZm9yZXtjb250ZW50OiIiO3Bvc2l0aW9uOmFic29sdXRlO2luc2V0OjRweDtib3JkZXItcmFkaXVzOjUwJTtiYWNrZ3JvdW5kOiMwYjE0MWU7fQoucHJvZ3Jlc3MtcmluZy5jdXJyZW50OmFmdGVye2NvbnRlbnQ6bm9uZTt9Ci5kYXktbGFiZWwsLm1vbnRoLWxhYmVse2ZvbnQtc2l6ZToxM3B4O2NvbG9yOiNlMWU4ZWZ9Ci5ib3R0b20tZ3JpZHtkaXNwbGF5OmdyaWQ7Z3JpZC10ZW1wbGF0ZS1jb2x1bW5zOjEuMDNmciAxZnI7Z2FwOjE2cHh9Ci5tb250aC1wYW5lbCwueWVhci1wYW5lbHttaW4taGVpZ2h0OjI4MnB4O3BhZGRpbmc6MTRweCAyMnB4IDE4cHh9Ci5tb250aC10aXRsZSwueWVhci10aXRsZXtmb250LXNpemU6Y2xhbXAoMjJweCwyLjJ2dywyOXB4KTtmb250LXdlaWdodDo2NTA7bGV0dGVyLXNwYWNpbmc6LS40cHg7bWFyZ2luOjAgMCAxMnB4IDJweH0KLnBlcmlvZC1oZWFkaW5ne2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjE0cHg7bWluLXdpZHRoOjA7bWFyZ2luOjAgMCA4cHh9Ci5wZXJpb2QtaGVhZGluZyAubW9udGgtdGl0bGUsLnBlcmlvZC1oZWFkaW5nIC55ZWFyLXRpdGxle21hcmdpbjowO2ZsZXg6MCAwIGF1dG99Ci5wZXJpb2QtcHJvZ3Jlc3N7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6MTBweDtmbGV4OjE7bWluLXdpZHRoOjB9Ci5wZXJpb2QtdHJhY2t7aGVpZ2h0OjNweDtmbGV4OjE7bWluLXdpZHRoOjI0cHg7b3ZlcmZsb3c6dmlzaWJsZTtwb3NpdGlvbjpyZWxhdGl2ZTtib3JkZXItcmFkaXVzOjk5cHg7YmFja2dyb3VuZDojMmIzYjRifQoucGVyaW9kLWZpbGx7aGVpZ2h0OjEwMCU7d2lkdGg6MDtwb3NpdGlvbjpyZWxhdGl2ZTtib3JkZXItcmFkaXVzOjk5cHg7YmFja2dyb3VuZDpsaW5lYXItZ3JhZGllbnQoOTBkZWcsIzQyZTZhNSwjOGZmZmQwKTtib3gtc2hhZG93OjAgMCA3cHggIzQ5ZTVhODY2O3RyYW5zaXRpb246d2lkdGggLjM1cyBlYXNlfQoucGVyaW9kLWZpbGw6YWZ0ZXJ7Y29udGVudDoiIjtwb3NpdGlvbjphYnNvbHV0ZTtyaWdodDotNXB4O3RvcDo1MCU7d2lkdGg6MTFweDtoZWlnaHQ6MTFweDtib3JkZXItcmFkaXVzOjUwJTt0cmFuc2Zvcm06dHJhbnNsYXRlWSgtNTAlKTtiYWNrZ3JvdW5kOiM1NGYwYjE7Ym9yZGVyOjJweCBzb2xpZCAjZDZmZmYwO2JveC1zaGFkb3c6MCAwIDdweCAzcHggIzQ4ZTdhZDk5LDAgMCAxNnB4IDRweCAjMzVkOTk1NjY7ei1pbmRleDoyfQoucGVyaW9kLXZhbHVle2ZsZXg6MCAwIDQwcHg7dGV4dC1hbGlnbjpyaWdodDtmb250LXNpemU6MTJweDtmb250LXdlaWdodDo3MDA7bGV0dGVyLXNwYWNpbmc6LjFweDtjb2xvcjojYTdmZmRiO2ZvbnQtdmFyaWFudC1udW1lcmljOnRhYnVsYXItbnVtc30KLm1vbnRoLXdlZWtkYXlze2Rpc3BsYXk6Z3JpZDtncmlkLXRlbXBsYXRlLWNvbHVtbnM6cmVwZWF0KDcsbWlubWF4KDAsMWZyKSk7Z2FwOjNweDttYXJnaW4tYm90dG9tOjVweH0KLm1vbnRoLXdlZWtkYXlzIHNwYW57dGV4dC1hbGlnbjpjZW50ZXI7Y29sb3I6I2I2YzJjZTtmb250LXNpemU6MTJweH0KLm1vbnRoLWdyaWR7ZGlzcGxheTpncmlkO2dyaWQtdGVtcGxhdGUtY29sdW1uczpyZXBlYXQoNyxtaW5tYXgoMCwxZnIpKTtncmlkLWF1dG8tcm93czo1MnB4O2dhcDowIDNweH0KLm1vbnRoLWNlbGx7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtqdXN0aWZ5LWNvbnRlbnQ6ZmxleC1zdGFydDtmbGV4LWRpcmVjdGlvbjpjb2x1bW47Z2FwOjNweDtwYWRkaW5nLXRvcDozcHg7bWluLXdpZHRoOjB9Ci5tb250aC1jZWxsIC5wcm9ncmVzcy1yaW5ne3dpZHRoOjI3cHg7aGVpZ2h0OjI3cHg7bWluLXdpZHRoOjI3cHg7bWluLWhlaWdodDoyN3B4O2ZsZXg6MCAwIDI3cHg7YXNwZWN0LXJhdGlvOjE7Ym9yZGVyLXdpZHRoOjJweH0KLm1vbnRoLWNlbGwgLnByb2dyZXNzLXJpbmcuY29tcGxldGU6YWZ0ZXJ7Zm9udC1zaXplOjE2cHh9Ci5tb250aC1jZWxsIC5wcm9ncmVzcy1yaW5nLmN1cnJlbnQ6YmVmb3Jle2luc2V0OjNweH0KLmRhdGUtbnVtYmVye2Rpc3BsYXk6YmxvY2s7ZmxleDowIDAgYXV0bztwb3NpdGlvbjpyZWxhdGl2ZTt6LWluZGV4OjE7Zm9udC1zaXplOjEycHg7bGluZS1oZWlnaHQ6MTRweDtjb2xvcjojZDVkZGU2O2ZvbnQtdmFyaWFudC1udW1lcmljOnRhYnVsYXItbnVtc30KLm1vbnRoLWNlbGwuZW1wdHkgLnByb2dyZXNzLXJpbmd7b3BhY2l0eTouMjJ9Ci55ZWFyLWdyaWR7ZGlzcGxheTpncmlkO2dyaWQtdGVtcGxhdGUtY29sdW1uczpyZXBlYXQoMyxtaW5tYXgoMCwxZnIpKTtncmlkLXRlbXBsYXRlLXJvd3M6cmVwZWF0KDQsMWZyKTttaW4taGVpZ2h0OjIyMHB4fQoueWVhci1pdGVte3Bvc2l0aW9uOnJlbGF0aXZlO2dhcDo1cHg7cGFkZGluZzo2cHggMH0KLnllYXItaXRlbTpudGgtY2hpbGQobis0KTpiZWZvcmV7Y29udGVudDoiIjtwb3NpdGlvbjphYnNvbHV0ZTt0b3A6MDtsZWZ0OjUlO3JpZ2h0OjUlO2hlaWdodDoxcHg7YmFja2dyb3VuZDojMjkzYjRifQoueWVhci1pdGVtIC5wcm9ncmVzcy1yaW5ne3dpZHRoOjM4cHg7aGVpZ2h0OjM4cHg7bWluLXdpZHRoOjM4cHg7bWluLWhlaWdodDozOHB4O2ZsZXg6MCAwIDM4cHg7YXNwZWN0LXJhdGlvOjF9Ci55ZWFyLWl0ZW0gLm1vbnRoLWxhYmVse2ZvbnQtc2l6ZToxM3B4fQpidXR0b257Zm9udDppbmhlcml0fQpAbWVkaWEobWF4LXdpZHRoOjc2MHB4KXsKIGJvZHl7cGFkZGluZzowfS5kYXNoYm9hcmR7cGFkZGluZzoxNnB4IDEycHggMjJweDttaW4taGVpZ2h0OjEwMHZofQogLmJyYW5ke21hcmdpbi1sZWZ0OjRweH0KIC5oZXJve2hlaWdodDoyNjBweDtiYWNrZ3JvdW5kLXBvc2l0aW9uOmNlbnRlcn0KIC5oZXJvLXRvcHtwYWRkaW5nOjE4cHggMTZweDtkaXNwbGF5OmJsb2NrO2hlaWdodDoxNzhweH0KIC5kYXRlLXRpdGxle2ZvbnQtc2l6ZToyN3B4fS5xdW90ZXtmb250LXNpemU6MTRweDttYXJnaW4tdG9wOjhweH0uYXV0aG9ye2ZvbnQtc2l6ZToxMnB4O21hcmdpbi10b3A6NHB4fQogLmNsb2NrLWFyZWF7cG9zaXRpb246YWJzb2x1dGU7cmlnaHQ6MTRweDt0b3A6MTRweDtnYXA6OXB4O3BhZGRpbmc6MH0KIC5kaWdpdGFse2ZvbnQtc2l6ZToyMXB4fS5kaWdpdGFsIC5zZWNvbmRze2ZvbnQtc2l6ZTouNThlbX0uY2xvY2stZGl2aWRlcntoZWlnaHQ6NDJweH0uYW5hbG9ne3dpZHRoOjU0cHg7aGVpZ2h0OjU0cHh9CiAuZGF0ZS1xdW90ZXtwYWRkaW5nLXRvcDo2NXB4fQogLnRpbWVsaW5le2xlZnQ6NSU7cmlnaHQ6NSU7Ym90dG9tOjI4cHh9CiAudGljay1sYWJlbHtmb250LXNpemU6OHB4fQogLnNlY3Rpb24td2Vla3toZWlnaHQ6YXV0bzttaW4taGVpZ2h0OjEwOHB4O3BhZGRpbmc6MTRweCAxMnB4O2Rpc3BsYXk6YmxvY2t9CiAuc2VjdGlvbi1oZWFkaW5ne2ZvbnQtc2l6ZToyMXB4O21hcmdpbi1ib3R0b206MTJweH0KIC53ZWVrLWRheXN7cG9zaXRpb246c3RhdGljO2xlZnQ6YXV0bzt0cmFuc2Zvcm06bm9uZTt3aWR0aDoxMDAlO2dhcDo0cHg7bWFyZ2luOjB9CiAucHJvZ3Jlc3MtcmluZ3t3aWR0aDozMnB4O2hlaWdodDozMnB4fS5wcm9ncmVzcy1yaW5nLmNvbXBsZXRlOmFmdGVye2ZvbnQtc2l6ZToxOHB4fQogLmRheS1sYWJlbCwubW9udGgtbGFiZWx7Zm9udC1zaXplOjExcHh9CiAuYm90dG9tLWdyaWR7Z3JpZC10ZW1wbGF0ZS1jb2x1bW5zOjFmcjtnYXA6MTJweH0KIC5tb250aC1wYW5lbCwueWVhci1wYW5lbHtwYWRkaW5nOjEzcHggMTJweCAxNXB4O21pbi1oZWlnaHQ6MH0KIC5tb250aC1ncmlke2dyaWQtYXV0by1yb3dzOjQ3cHh9CiAubW9udGgtdGl0bGUsLnllYXItdGl0bGV7Zm9udC1zaXplOjIzcHh9CiAucGVyaW9kLWhlYWRpbmd7Z2FwOjlweDttYXJnaW4tYm90dG9tOjhweH0KIC5wZXJpb2QtcHJvZ3Jlc3N7Z2FwOjdweH0KIC5wZXJpb2QtdmFsdWV7ZmxleC1iYXNpczozNnB4O2ZvbnQtc2l6ZToxMXB4fQogLnllYXItZ3JpZHttaW4taGVpZ2h0OjIwNXB4fQp9CgovKiBFbWJlZGRlZCBkYXNoYm9hcmQgZml0ICsgc3luY2hyb25pemVkIGxpZ2h0IGFwcGVhcmFuY2UgKi8KaHRtbCxib2R5e3dpZHRoOjEwMCU7bWluLXdpZHRoOjA7bWluLWhlaWdodDoxMDAlO292ZXJmbG93LXg6aGlkZGVuO2JhY2tncm91bmQ6IzA1MGMxM30KLmRhc2hib2FyZHsKICB3aWR0aDoxMDAlO21heC13aWR0aDoxNTAwcHg7bWFyZ2luOjAgYXV0bzsKICBwYWRkaW5nOjEycHggY2xhbXAoMTRweCwxLjZ2dywyNHB4KSAxNnB4OwogIG1pbi1oZWlnaHQ6NzIwcHg7Cn0KLmJyYW5ke2hlaWdodDozMHB4O3dpZHRoOjEwMCU7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtqdXN0aWZ5LWNvbnRlbnQ6Y2VudGVyO21hcmdpbjowIGF1dG8gMTBweDtwYWRkaW5nOjB9Ci5oZXJve2hlaWdodDoyMzJweDttYXJnaW4tYm90dG9tOjEycHh9Ci5zZWN0aW9uLXdlZWt7aGVpZ2h0Ojk2cHg7bWFyZ2luLWJvdHRvbToxMnB4O3BhZGRpbmc6MTJweCAyMnB4fQoud2Vlay1kYXlze3dpZHRoOm1pbig2OCUsODIwcHgpO2dhcDpjbGFtcCg4cHgsMi4xdncsMzRweCk7dHJhbnNmb3JtOnRyYW5zbGF0ZSgtNTAlLC01cHgpfQoud2Vlay1wcm9ncmVzc3twb3NpdGlvbjphYnNvbHV0ZTtsZWZ0OjI4cHg7cmlnaHQ6MjhweDtib3R0b206OHB4O2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjEwcHg7aGVpZ2h0OjhweDt6LWluZGV4OjJ9Ci53ZWVrLXRyYWNre2hlaWdodDozcHh9Ci53ZWVrLXByb2dyZXNzIC5wZXJpb2QtdmFsdWV7ZmxleDowIDAgNDBweH0KLm1vbnRoLXBhbmVsLC55ZWFyLXBhbmVse21pbi1oZWlnaHQ6MDtwYWRkaW5nOjEycHggMThweCAxNHB4fQoubW9udGgtZ3JpZHtncmlkLWF1dG8tcm93czo0OXB4fQoueWVhci1ncmlke21pbi1oZWlnaHQ6MTkwcHh9Ci5tb250aC10aXRsZSwueWVhci10aXRsZXttYXJnaW4tYm90dG9tOjhweH0KQG1lZGlhKG1heC13aWR0aDo3NjBweCl7CiAgLmRhc2hib2FyZHtwYWRkaW5nOjE0cHggMTJweCAxOHB4O21pbi1oZWlnaHQ6MH0KICAuYnJhbmR7aGVpZ2h0OjMwcHg7d2lkdGg6MTAwJTtqdXN0aWZ5LWNvbnRlbnQ6Y2VudGVyO21hcmdpbjowIGF1dG8gMTBweDtwYWRkaW5nOjB9CiAgLmhlcm97aGVpZ2h0OjI1MHB4fQogIC5zZWN0aW9uLXdlZWt7aGVpZ2h0OmF1dG87bWluLWhlaWdodDoxMzJweDttYXJnaW4tYm90dG9tOjEycHh9CiAgLndlZWstZGF5c3t0cmFuc2Zvcm06bm9uZX0KICAud2Vlay1wcm9ncmVzc3twb3NpdGlvbjpyZWxhdGl2ZTtsZWZ0OmF1dG87cmlnaHQ6YXV0bztib3R0b206YXV0bzttYXJnaW46OXB4IDJweCAwO2hlaWdodDo4cHh9CiAgLm1vbnRoLWdyaWR7Z3JpZC1hdXRvLXJvd3M6NDlweH0KICAueWVhci1ncmlke21pbi1oZWlnaHQ6MTk1cHh9CiAgLmRhc2hib2FyZHttaW4taGVpZ2h0OjB9Cn0KCmh0bWwubGlnaHQtbW9kZSxodG1sLmxpZ2h0LW1vZGUgYm9keSxib2R5LmxpZ2h0LW1vZGV7YmFja2dyb3VuZDojZTllZGYyIWltcG9ydGFudDtjb2xvcjojMjQzNDQ5fQpib2R5LmxpZ2h0LW1vZGUgLmRhc2hib2FyZHsKICBtaW4taGVpZ2h0OjEwMHZoOwogIGJhY2tncm91bmQ6bGluZWFyLWdyYWRpZW50KDE0NWRlZywjZWRmMWY1IDAlLCNlNGU5ZWYgMTAwJSk7CiAgY29sb3I6IzI0MzQ0OTsKfQpib2R5LmxpZ2h0LW1vZGUgLmJyYW5ke2NvbG9yOiMyNDM0NDl9CmJvZHkubGlnaHQtbW9kZSAubG9nbzpiZWZvcmV7Ym9yZGVyLWJvdHRvbS1jb2xvcjojNTI2NzdmfQpib2R5LmxpZ2h0LW1vZGUgLmxvZ286YWZ0ZXJ7Ym9yZGVyLWJvdHRvbS1jb2xvcjojOTFhMmI2fQpib2R5LmxpZ2h0LW1vZGUgLnBhbmVsOm5vdCguaGVybyl7CiAgYmFja2dyb3VuZDpsaW5lYXItZ3JhZGllbnQoMTQ1ZGVnLHJnYmEoMjU1LDI1NSwyNTUsLjk2KSxyZ2JhKDI0MiwyNDYsMjUwLC45OCkpOwogIGJvcmRlci1jb2xvcjojY2JkNWUxOwogIGJveC1zaGFkb3c6MCA1cHggMTZweCByZ2JhKDM4LDU2LDc4LC4wNiksaW5zZXQgMCAxcHggMCByZ2JhKDI1NSwyNTUsMjU1LC45KTsKfQpib2R5LmxpZ2h0LW1vZGUgLnNlY3Rpb24taGVhZGluZywKYm9keS5saWdodC1tb2RlIC5tb250aC10aXRsZSwKYm9keS5saWdodC1tb2RlIC55ZWFyLXRpdGxle2NvbG9yOiMxZTJkNDB9CmJvZHkubGlnaHQtbW9kZSAucGVyaW9kLXRyYWNre2JhY2tncm91bmQ6I2NiZDVlMX0KYm9keS5saWdodC1tb2RlIC5wZXJpb2QtZmlsbHtiYWNrZ3JvdW5kOmxpbmVhci1ncmFkaWVudCg5MGRlZywjMjQ5YjcwLCM1NGM5YTApO2JveC1zaGFkb3c6bm9uZX0KYm9keS5saWdodC1tb2RlIC5wZXJpb2QtdmFsdWV7Y29sb3I6IzI4NmM1OX0KYm9keS5saWdodC1tb2RlIC5kYXktbGFiZWwsCmJvZHkubGlnaHQtbW9kZSAubW9udGgtbGFiZWwsCmJvZHkubGlnaHQtbW9kZSAuZGF0ZS1udW1iZXJ7Y29sb3I6IzQzNTQ2YX0KYm9keS5saWdodC1tb2RlIC5tb250aC13ZWVrZGF5cyBzcGFue2NvbG9yOiM3MTgwOTZ9CmJvZHkubGlnaHQtbW9kZSAucHJvZ3Jlc3MtcmluZ3tib3JkZXItY29sb3I6I2MwY2NkOX0KYm9keS5saWdodC1tb2RlIC5wcm9ncmVzcy1yaW5nLmN1cnJlbnR7YmFja2dyb3VuZDpjb25pYy1ncmFkaWVudCgjMjJiOTgxIGNhbGModmFyKC0tcHJvZ3Jlc3MsMCkqMSUpLCNjYmQ1ZTEgMCl9CmJvZHkubGlnaHQtbW9kZSAucHJvZ3Jlc3MtcmluZy5jdXJyZW50OmJlZm9yZXtiYWNrZ3JvdW5kOiNmN2Y5ZmN9CmJvZHkubGlnaHQtbW9kZSAueWVhci1pdGVtOm50aC1jaGlsZChuKzQpOmJlZm9yZXtiYWNrZ3JvdW5kOiNkNmRlZTh9CgoKYm9keS5saWdodC1tb2RlIC5oZXJvewogIGNvbG9yOiNmNGY3ZmI7CiAgYmFja2dyb3VuZC1pbWFnZTp2YXIoLS1oZXJvLWxheWVyZWQtYmcpOwogIGJhY2tncm91bmQtc2l6ZTpjb3ZlcjsKICBiYWNrZ3JvdW5kLXBvc2l0aW9uOmNlbnRlciA0OCU7Cn0KYm9keS5saWdodC1tb2RlIC5oZXJvIC5kYXRlLXRpdGxlLApib2R5LmxpZ2h0LW1vZGUgLmhlcm8gLnF1b3RlLApib2R5LmxpZ2h0LW1vZGUgLmhlcm8gLmF1dGhvcntjb2xvcjojZjRmN2ZifQoKCi8qIEdsb2JhbCB0eXBvZ3JhcGh5OiBBcmlhbCB0aHJvdWdob3V0IHRoZSBUaW1lbGluZSBkYXNoYm9hcmQuICovCmh0bWwsYm9keSxib2R5ICp7Zm9udC1mYW1pbHk6QXJpYWwsSGVsdmV0aWNhLHNhbnMtc2VyaWYhaW1wb3J0YW50fQo8L3N0eWxlPgo8L2hlYWQ+Cjxib2R5Pgo8bWFpbiBjbGFzcz0iZGFzaGJvYXJkIj4KICA8c2VjdGlvbiBjbGFzcz0icGFuZWwgaGVybyIgYXJpYS1sYWJlbD0iVG9kYXkncyBkYXRlIGFuZCB0aW1lIj4KICAgIDxkaXYgY2xhc3M9Imhlcm8tdG9wIj4KICAgICAgPGRpdiBjbGFzcz0iZGF0ZS1xdW90ZSI+CiAgICAgICAgPGRpdiBjbGFzcz0iZGF0ZS10aXRsZSIgaWQ9ImRhdGVUaXRsZSI+TG9hZGluZyBkYXRl4oCmPC9kaXY+CiAgICAgICAgPGRpdiBjbGFzcz0icXVvdGUiIGlkPSJkYWlseVF1b3RlIj7igJxEaXNjaXBsaW5lIHRvZGF5IGJ1aWxkcyB0aGUgZnJlZWRvbSB0b21vcnJvdy7igJ08L2Rpdj4KICAgICAgICA8ZGl2IGNsYXNzPSJhdXRob3IiIGlkPSJkYWlseVF1b3RlQXV0aG9yIj7igJQgSmFtZXMgQ2xlYXI8L2Rpdj4KICAgICAgPC9kaXY+CiAgICAgIDxkaXYgY2xhc3M9ImNsb2NrLWFyZWEiPgogICAgICAgIDxkaXYgY2xhc3M9ImRpZ2l0YWwiIGlkPSJkaWdpdGFsQ2xvY2siPi0tOi0tOjxzcGFuIGNsYXNzPSJzZWNvbmRzIj4tLTwvc3Bhbj4gPHNtYWxsPi0tPC9zbWFsbD48L2Rpdj4KICAgICAgICA8ZGl2IGNsYXNzPSJjbG9jay1kaXZpZGVyIj48L2Rpdj4KICAgICAgICA8c3ZnIGNsYXNzPSJhbmFsb2ciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIiByb2xlPSJpbWciIGFyaWEtbGFiZWw9IkFuYWxvZ3VlIGNsb2NrIj4KICAgICAgICAgIDxjaXJjbGUgY3g9IjUwIiBjeT0iNTAiIHI9IjQ2IiBmaWxsPSIjMDgxMjFkOTkiIHN0cm9rZT0iIzUyNjM3MyIgc3Ryb2tlLXdpZHRoPSIxLjQiLz4KICAgICAgICAgIDxnIGlkPSJjbG9ja1RpY2tzIiBzdHJva2U9IiM5YWFiYjkiIHN0cm9rZS13aWR0aD0iMSIgb3BhY2l0eT0iLjgiPjwvZz4KICAgICAgICAgIDxnIGZpbGw9IiNkY2U1ZWQiIGZvbnQtc2l6ZT0iOSIgZm9udC13ZWlnaHQ9IjYwMCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+CiAgICAgICAgICAgIDx0ZXh0IHg9IjUwIiB5PSIxNCI+MTI8L3RleHQ+PHRleHQgeD0iODYiIHk9IjUzIj4zPC90ZXh0Pjx0ZXh0IHg9IjUwIiB5PSI5MSI+NjwvdGV4dD48dGV4dCB4PSIxNCIgeT0iNTMiPjk8L3RleHQ+CiAgICAgICAgICA8L2c+CiAgICAgICAgICA8bGluZSBpZD0iaG91ckhhbmQiIHgxPSI1MCIgeTE9IjUwIiB4Mj0iNTAiIHkyPSIyOSIgc3Ryb2tlPSIjZWVmNGY4IiBzdHJva2Utd2lkdGg9IjMuMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+CiAgICAgICAgICA8bGluZSBpZD0ibWludXRlSGFuZCIgeDE9IjUwIiB5MT0iNTAiIHgyPSI1MCIgeTI9IjE4IiBzdHJva2U9IiNlZWY0ZjgiIHN0cm9rZS13aWR0aD0iMi4yIiBzdHJva2UtbGluZWNhcD0icm91bmQiLz4KICAgICAgICAgIDxsaW5lIGlkPSJzZWNvbmRIYW5kIiB4MT0iNTAiIHkxPSI1MCIgeDI9IjUwIiB5Mj0iMTAiIHN0cm9rZT0iIzYyZWRiNCIgc3Ryb2tlLXdpZHRoPSIxIiBzdHJva2UtbGluZWNhcD0icm91bmQiLz4KICAgICAgICAgIDxjaXJjbGUgY3g9IjUwIiBjeT0iNTAiIHI9IjMuMyIgZmlsbD0iIzQyZDk5MyIvPgogICAgICAgIDwvc3ZnPgogICAgICA8L2Rpdj4KICAgIDwvZGl2PgogICAgPGRpdiBjbGFzcz0idGltZWxpbmUiIGlkPSJ0aW1lbGluZSI+CiAgICAgIDxkaXYgY2xhc3M9InRyYWNrIj48L2Rpdj48ZGl2IGNsYXNzPSJ0cmFjay1maWxsIiBpZD0idHJhY2tGaWxsIj48L2Rpdj4KICAgICAgPHNwYW4gY2xhc3M9Im1hcmtlciBzdGFydCIgc3R5bGU9ImxlZnQ6MCUiPjwvc3Bhbj4KICAgICAgPHNwYW4gY2xhc3M9Im1hcmtlciBlbmQiIHN0eWxlPSJsZWZ0OjEwMCUiPjwvc3Bhbj4KICAgICAgPHNwYW4gY2xhc3M9ImN1cnJlbnQtZG90IiBpZD0iY3VycmVudERvdCIgc3R5bGU9ImxlZnQ6MCUiPjwvc3Bhbj4KICAgICAgPHNwYW4gY2xhc3M9InRpY2stbGFiZWwgZWRnZS1sZWZ0IiBzdHlsZT0ibGVmdDowJSI+MTJBTTwvc3Bhbj4KICAgICAgPHNwYW4gY2xhc3M9InRpY2stbGFiZWwiIHN0eWxlPSJsZWZ0OjI1JSI+NkFNPC9zcGFuPgogICAgICA8c3BhbiBjbGFzcz0idGljay1sYWJlbCIgc3R5bGU9ImxlZnQ6NzUlIj42UE08L3NwYW4+CiAgICAgIDxzcGFuIGNsYXNzPSJ0aWNrLWxhYmVsIiBzdHlsZT0ibGVmdDo4Ny41JSI+OVBNPC9zcGFuPgogICAgICA8c3BhbiBjbGFzcz0idGljay1sYWJlbCBlZGdlLXJpZ2h0IiBzdHlsZT0ibGVmdDoxMDAlIj4xMkFNPC9zcGFuPgogICAgICA8c3BhbiBjbGFzcz0ibWFya2VyIGRvbmUiIHN0eWxlPSJsZWZ0OjI1JSI+PC9zcGFuPgogICAgICA8c3BhbiBjbGFzcz0ibWFya2VyIiBzdHlsZT0ibGVmdDo3NSUiPjwvc3Bhbj4KICAgICAgPHNwYW4gY2xhc3M9Im1hcmtlciIgc3R5bGU9ImxlZnQ6ODcuNSUiPjwvc3Bhbj4KICAgIDwvZGl2PgogIDwvc2VjdGlvbj4KCiAgPHNlY3Rpb24gY2xhc3M9InBhbmVsIHNlY3Rpb24td2VlayI+CiAgICA8aDIgY2xhc3M9InNlY3Rpb24taGVhZGluZyIgaWQ9IndlZWtUaXRsZSI+V2VlayAj4oCUPC9oMj4KICAgIDxkaXYgY2xhc3M9IndlZWstZGF5cyIgaWQ9IndlZWtEYXlzIj48L2Rpdj4KICAgIDxkaXYgY2xhc3M9IndlZWstcHJvZ3Jlc3MiIHJvbGU9Imdyb3VwIiBhcmlhLWxhYmVsPSJXZWVrIHByb2dyZXNzIj4KICAgICAgPGRpdiBjbGFzcz0icGVyaW9kLXRyYWNrIHdlZWstdHJhY2siIHJvbGU9InByb2dyZXNzYmFyIiBhcmlhLWxhYmVsPSJXZWVrIHByb2dyZXNzIiBhcmlhLXZhbHVlbWluPSIwIiBhcmlhLXZhbHVlbWF4PSIxMDAiIGFyaWEtdmFsdWVub3c9IjAiPjxkaXYgY2xhc3M9InBlcmlvZC1maWxsIiBpZD0id2Vla1Byb2dyZXNzRmlsbCI+PC9kaXY+PC9kaXY+CiAgICAgIDxzcGFuIGNsYXNzPSJwZXJpb2QtdmFsdWUiIGlkPSJ3ZWVrUHJvZ3Jlc3NWYWx1ZSI+MCU8L3NwYW4+CiAgICA8L2Rpdj4KICA8L3NlY3Rpb24+CgogIDxkaXYgY2xhc3M9ImJvdHRvbS1ncmlkIj4KICAgIDxzZWN0aW9uIGNsYXNzPSJwYW5lbCBtb250aC1wYW5lbCI+CiAgICAgIDxkaXYgY2xhc3M9InBlcmlvZC1oZWFkaW5nIj4KICAgICAgICA8aDIgY2xhc3M9Im1vbnRoLXRpdGxlIiBpZD0ibW9udGhUaXRsZSI+TW9udGg8L2gyPgogICAgICAgIDxkaXYgY2xhc3M9InBlcmlvZC1wcm9ncmVzcyIgcm9sZT0iZ3JvdXAiIGFyaWEtbGFiZWw9Ik1vbnRoIHByb2dyZXNzIj4KICAgICAgICAgIDxkaXYgY2xhc3M9InBlcmlvZC10cmFjayIgcm9sZT0icHJvZ3Jlc3NiYXIiIGFyaWEtbGFiZWw9Ik1vbnRoIHByb2dyZXNzIiBhcmlhLXZhbHVlbWluPSIwIiBhcmlhLXZhbHVlbWF4PSIxMDAiIGFyaWEtdmFsdWVub3c9IjAiPjxkaXYgY2xhc3M9InBlcmlvZC1maWxsIiBpZD0ibW9udGhQcm9ncmVzc0ZpbGwiPjwvZGl2PjwvZGl2PgogICAgICAgICAgPHNwYW4gY2xhc3M9InBlcmlvZC12YWx1ZSIgaWQ9Im1vbnRoUHJvZ3Jlc3NWYWx1ZSI+MCU8L3NwYW4+CiAgICAgICAgPC9kaXY+CiAgICAgIDwvZGl2PgogICAgICA8ZGl2IGNsYXNzPSJtb250aC13ZWVrZGF5cyI+PHNwYW4+TW9uPC9zcGFuPjxzcGFuPlR1ZTwvc3Bhbj48c3Bhbj5XZWQ8L3NwYW4+PHNwYW4+VGh1PC9zcGFuPjxzcGFuPkZyaTwvc3Bhbj48c3Bhbj5TYXQ8L3NwYW4+PHNwYW4+U3VuPC9zcGFuPjwvZGl2PgogICAgICA8ZGl2IGNsYXNzPSJtb250aC1ncmlkIiBpZD0ibW9udGhHcmlkIj48L2Rpdj4KICAgIDwvc2VjdGlvbj4KICAgIDxzZWN0aW9uIGNsYXNzPSJwYW5lbCB5ZWFyLXBhbmVsIj4KICAgICAgPGRpdiBjbGFzcz0icGVyaW9kLWhlYWRpbmciPgogICAgICAgIDxoMiBjbGFzcz0ieWVhci10aXRsZSIgaWQ9InllYXJUaXRsZSI+WWVhcjwvaDI+CiAgICAgICAgPGRpdiBjbGFzcz0icGVyaW9kLXByb2dyZXNzIiByb2xlPSJncm91cCIgYXJpYS1sYWJlbD0iWWVhciBwcm9ncmVzcyI+CiAgICAgICAgICA8ZGl2IGNsYXNzPSJwZXJpb2QtdHJhY2siIHJvbGU9InByb2dyZXNzYmFyIiBhcmlhLWxhYmVsPSJZZWFyIHByb2dyZXNzIiBhcmlhLXZhbHVlbWluPSIwIiBhcmlhLXZhbHVlbWF4PSIxMDAiIGFyaWEtdmFsdWVub3c9IjAiPjxkaXYgY2xhc3M9InBlcmlvZC1maWxsIiBpZD0ieWVhclByb2dyZXNzRmlsbCI+PC9kaXY+PC9kaXY+CiAgICAgICAgICA8c3BhbiBjbGFzcz0icGVyaW9kLXZhbHVlIiBpZD0ieWVhclByb2dyZXNzVmFsdWUiPjAlPC9zcGFuPgogICAgICAgIDwvZGl2PgogICAgICA8L2Rpdj4KICAgICAgPGRpdiBjbGFzcz0ieWVhci1ncmlkIiBpZD0ieWVhckdyaWQiPjwvZGl2PgogICAgPC9zZWN0aW9uPgogIDwvZGl2Pgo8L21haW4+Cgo8c2NyaXB0PgooKCkgPT4gewogIC8vIEFsbCBjYWxlbmRhciBhbmQgY2xvY2sgdmFsdWVzIGFyZSBjYWxjdWxhdGVkIGZyb20gdGhlIGxpdmUgQXNpYS9Lb2xrYXRhIGRhdGUvdGltZS4KICBjb25zdCBUWiA9ICdBc2lhL0tvbGthdGEnOwogIGNvbnN0ICQgPSBpZCA9PiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChpZCk7CiAgY29uc3QgcGFkID0gbiA9PiBTdHJpbmcobikucGFkU3RhcnQoMiwgJzAnKTsKCiAgLy8gQSBkaWZmZXJlbnQgcXVvdGUgYW5kIFVuc3BsYXNoIG1vdW50YWluIHBob3RvZ3JhcGggYXJlIHNlbGVjdGVkIGVhY2ggZGF5LgogIC8vIFRoZSBleGlzdGluZyBlbWJlZGRlZCBtb3VudGFpbiBpbWFnZSByZW1haW5zIHRoZSBvZmZsaW5lL25ldHdvcmstZmFpbHVyZSBmYWxsYmFjay4KICBjb25zdCBkYWlseVF1b3RlcyA9IFsKICAgIFsnWW91IGRvIG5vdCByaXNlIHRvIHRoZSBsZXZlbCBvZiB5b3VyIGdvYWxzLiBZb3UgZmFsbCB0byB0aGUgbGV2ZWwgb2YgeW91ciBzeXN0ZW1zLicsICdKYW1lcyBDbGVhciddLAogICAgWydFdmVyeSBhY3Rpb24geW91IHRha2UgaXMgYSB2b3RlIGZvciB0aGUgdHlwZSBvZiBwZXJzb24geW91IHdpc2ggdG8gYmVjb21lLicsICdKYW1lcyBDbGVhciddLAogICAgWydIYWJpdHMgYXJlIHRoZSBjb21wb3VuZCBpbnRlcmVzdCBvZiBzZWxmLWltcHJvdmVtZW50LicsICdKYW1lcyBDbGVhciddLAogICAgWydZb3Ugc2hvdWxkIGJlIGZhciBtb3JlIGNvbmNlcm5lZCB3aXRoIHlvdXIgY3VycmVudCB0cmFqZWN0b3J5IHRoYW4gd2l0aCB5b3VyIGN1cnJlbnQgcmVzdWx0cy4nLCAnSmFtZXMgQ2xlYXInXSwKICAgIFsnVGhlIGdyZWF0ZXN0IHRocmVhdCB0byBzdWNjZXNzIGlzIG5vdCBmYWlsdXJlIGJ1dCBib3JlZG9tLicsICdKYW1lcyBDbGVhciddLAogICAgWydUaGUgbW9zdCBlZmZlY3RpdmUgd2F5IHRvIGNoYW5nZSB5b3VyIGhhYml0cyBpcyB0byBmb2N1cyBvbiB3aG8geW91IHdpc2ggdG8gYmVjb21lLicsICdKYW1lcyBDbGVhciddLAogICAgWydZb3UgY2FuIGFsc28gYmUgdGhlIGFyY2hpdGVjdCBvZiB5b3VyIGVudmlyb25tZW50LicsICdKYW1lcyBDbGVhciddCiAgXTsKICBjb25zdCBkYWlseU1vdW50YWluSW1hZ2VzID0gWwogICAgJ2h0dHBzOi8vaW1hZ2VzLnVuc3BsYXNoLmNvbS9waG90by0xNDY0ODIyNzU5MDIzLWZlZDYyMmZmMmMzYj9hdXRvPWZvcm1hdCZmaXQ9Y3JvcCZ3PTIyMDAmcT04NScsCiAgICAnaHR0cHM6Ly9pbWFnZXMudW5zcGxhc2guY29tL3Bob3RvLTE0NTQ0OTY1MjI0ODgtN2E4ZTQ4OGU4NjA2P2F1dG89Zm9ybWF0JmZpdD1jcm9wJnc9MjIwMCZxPTg1JywKICAgICdodHRwczovL2ltYWdlcy51bnNwbGFzaC5jb20vcGhvdG8tMTUxOTY4MTM5Mzc4NC1kMTIwMjY3OTMzYmE/YXV0bz1mb3JtYXQmZml0PWNyb3Amdz0yMjAwJnE9ODUnLAogICAgJ2h0dHBzOi8vaW1hZ2VzLnVuc3BsYXNoLmNvbS9waG90by0xNDcwNzcwODQxMDcyLWY5NzhjZjRkMDE5ZT9hdXRvPWZvcm1hdCZmaXQ9Y3JvcCZ3PTIyMDAmcT04NScsCiAgICAnaHR0cHM6Ly9pbWFnZXMudW5zcGxhc2guY29tL3Bob3RvLTE1MDA1MzA4NTU2OTctYjU4NmQ4OWJhM2VlP2F1dG89Zm9ybWF0JmZpdD1jcm9wJnc9MjIwMCZxPTg1JywKICAgICdodHRwczovL2ltYWdlcy51bnNwbGFzaC5jb20vcGhvdG8tMTQ2OTQ3NDk2ODAyOC01NjYyM2YwMmU0MmU/YXV0bz1mb3JtYXQmZml0PWNyb3Amdz0yMjAwJnE9ODUnLAogICAgJ2h0dHBzOi8vaW1hZ2VzLnVuc3BsYXNoLmNvbS9waG90by0xNTAwNTM0NjIzMjgzLTMxMmFhZGU0ODViNz9hdXRvPWZvcm1hdCZmaXQ9Y3JvcCZ3PTIyMDAmcT04NScKICBdOwogIGZ1bmN0aW9uIHJlZnJlc2hEYWlseUluc3BpcmF0aW9uKHksIG0sIGQpIHsKICAgIGNvbnN0IGtleSA9IGAke3l9LSR7cGFkKG0gKyAxKX0tJHtwYWQoZCl9YDsKICAgIGlmICh3aW5kb3cuX19kYWlseUluc3BpcmF0aW9uS2V5ID09PSBrZXkpIHJldHVybjsKICAgIHdpbmRvdy5fX2RhaWx5SW5zcGlyYXRpb25LZXkgPSBrZXk7CiAgICBjb25zdCBpbmRleCA9ICgoZGF5T3JkaW5hbCh5LCBtLCBkKSAlIGRhaWx5UXVvdGVzLmxlbmd0aCkgKyBkYWlseVF1b3Rlcy5sZW5ndGgpICUgZGFpbHlRdW90ZXMubGVuZ3RoOwogICAgY29uc3QgcXVvdGUgPSBkYWlseVF1b3Rlc1tpbmRleF07CiAgICAkKCdkYWlseVF1b3RlJykudGV4dENvbnRlbnQgPSBg4oCcJHtxdW90ZVswXX3igJ1gOwogICAgJCgnZGFpbHlRdW90ZUF1dGhvcicpLnRleHRDb250ZW50ID0gYOKAlCAke3F1b3RlWzFdfWA7CgogICAgY29uc3QgaW1hZ2VVcmwgPSBkYWlseU1vdW50YWluSW1hZ2VzW2luZGV4ICUgZGFpbHlNb3VudGFpbkltYWdlcy5sZW5ndGhdOwogICAgY29uc3QgcHJlbG9hZCA9IG5ldyBJbWFnZSgpOwogICAgcHJlbG9hZC5vbmxvYWQgPSAoKSA9PiB7CiAgICAgIGNvbnN0IGxheWVyZWQgPSBgbGluZWFyLWdyYWRpZW50KDkwZGVnLHJnYmEoNCwxMiwyMCwuMzgpLHJnYmEoNCwxMiwyMCwuMSkgNTUlLHJnYmEoNCwxMiwyMCwuNDgpKSxsaW5lYXItZ3JhZGllbnQoMGRlZyxyZ2JhKDQsMTIsMjAsLjgpLHRyYW5zcGFyZW50IDU4JSksdXJsKCIke2ltYWdlVXJsfSIpYDsKICAgICAgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnN0eWxlLnNldFByb3BlcnR5KCctLWhlcm8tbGF5ZXJlZC1iZycsIGxheWVyZWQpOwogICAgfTsKICAgIHByZWxvYWQuc3JjID0gaW1hZ2VVcmw7CiAgfQoKICBjb25zdCBwYXJ0c0F0ID0gZGF0ZSA9PiB7CiAgICBjb25zdCBwYXJ0cyA9IG5ldyBJbnRsLkRhdGVUaW1lRm9ybWF0KCdlbi1DQScsIHsKICAgICAgdGltZVpvbmU6IFRaLCB5ZWFyOiAnbnVtZXJpYycsIG1vbnRoOiAnMi1kaWdpdCcsIGRheTogJzItZGlnaXQnLAogICAgICBob3VyOiAnMi1kaWdpdCcsIG1pbnV0ZTogJzItZGlnaXQnLCBzZWNvbmQ6ICcyLWRpZ2l0JywgaG91ckN5Y2xlOiAnaDIzJwogICAgfSkuZm9ybWF0VG9QYXJ0cyhkYXRlKTsKICAgIHJldHVybiBPYmplY3QuZnJvbUVudHJpZXMocGFydHMubWFwKHAgPT4gW3AudHlwZSwgcC52YWx1ZV0pKTsKICB9OwogIGNvbnN0IGRhdGVMYWJlbCA9IGRhdGUgPT4gbmV3IEludGwuRGF0ZVRpbWVGb3JtYXQoJ2VuLUlOJywgewogICAgdGltZVpvbmU6IFRaLCBtb250aDogJ2xvbmcnLCBkYXk6ICdudW1lcmljJwogIH0pLmZvcm1hdChkYXRlKSArICcg4oCTICcgKyBuZXcgSW50bC5EYXRlVGltZUZvcm1hdCgnZW4tSU4nLCB7CiAgICB0aW1lWm9uZTogVFosIHdlZWtkYXk6ICdsb25nJwogIH0pLmZvcm1hdChkYXRlKTsKCiAgLy8gVVRDIGRhdGUtb25seSBhcml0aG1ldGljIGF2b2lkcyBlcnJvcnMgaWYgdGhlIGJyb3dzZXIgaXRzZWxmIHVzZXMgYW5vdGhlciB0aW1lem9uZS4KICBjb25zdCB1dGNEYXRlID0gKHksIG0sIGQpID0+IG5ldyBEYXRlKERhdGUuVVRDKHksIG0sIGQpKTsKICBjb25zdCBkYXRlS2V5ID0gKHksIG0sIGQpID0+IGAke3l9LSR7cGFkKG0gKyAxKX0tJHtwYWQoZCl9YDsKICBjb25zdCBkYXlPcmRpbmFsID0gKHksIG0sIGQpID0+IE1hdGguZmxvb3IodXRjRGF0ZSh5LCBtLCBkKS5nZXRUaW1lKCkgLyA4NjQwMDAwMCk7CgogIGZ1bmN0aW9uIGlzb1dlZWsoeSwgbSwgZCkgewogICAgY29uc3QgZGF0ZSA9IHV0Y0RhdGUoeSwgbSwgZCk7CiAgICBjb25zdCB3ZWVrZGF5ID0gZGF0ZS5nZXRVVENEYXkoKSB8fCA3OwogICAgZGF0ZS5zZXRVVENEYXRlKGRhdGUuZ2V0VVRDRGF0ZSgpICsgNCAtIHdlZWtkYXkpOwogICAgY29uc3QgeWVhclN0YXJ0ID0gdXRjRGF0ZShkYXRlLmdldFVUQ0Z1bGxZZWFyKCksIDAsIDEpOwogICAgcmV0dXJuIE1hdGguY2VpbCgoKChkYXRlIC0geWVhclN0YXJ0KSAvIDg2NDAwMDAwKSArIDEpIC8gNyk7CiAgfQoKICBmdW5jdGlvbiByaW5nKHN0YXR1cywgcHJvZ3Jlc3MgPSAwLCBsYWJlbCA9ICcnKSB7CiAgICBpZiAoc3RhdHVzID09PSAnY29tcGxldGUnKSB7CiAgICAgIHJldHVybiBgPHNwYW4gY2xhc3M9InByb2dyZXNzLXJpbmcgY29tcGxldGUiIHJvbGU9ImltZyIgYXJpYS1sYWJlbD0iJHtsYWJlbH06IGNvbXBsZXRlZCI+PC9zcGFuPmA7CiAgICB9CiAgICBpZiAoc3RhdHVzID09PSAnY3VycmVudCcpIHsKICAgICAgcmV0dXJuIGA8c3BhbiBjbGFzcz0icHJvZ3Jlc3MtcmluZyBjdXJyZW50IiBzdHlsZT0iLS1wcm9ncmVzczoke01hdGgubWF4KDAsIE1hdGgubWluKDEwMCwgcHJvZ3Jlc3MpKS50b0ZpeGVkKDIpfSIgcm9sZT0iaW1nIiBhcmlhLWxhYmVsPSIke2xhYmVsfTogJHtNYXRoLnJvdW5kKHByb2dyZXNzKX0lIGVsYXBzZWQiPjwvc3Bhbj5gOwogICAgfQogICAgcmV0dXJuIGA8c3BhbiBjbGFzcz0icHJvZ3Jlc3MtcmluZyIgcm9sZT0iaW1nIiBhcmlhLWxhYmVsPSIke2xhYmVsfTogdXBjb21pbmciPjwvc3Bhbj5gOwogIH0KCiAgZnVuY3Rpb24gcmVuZGVyQ2FsZW5kYXJzKG5vdywgcCwgZGF5UHJvZ3Jlc3MpIHsKICAgIGNvbnN0IHkgPSBOdW1iZXIocC55ZWFyKSwgbSA9IE51bWJlcihwLm1vbnRoKSAtIDEsIHRvZGF5ID0gTnVtYmVyKHAuZGF5KTsKICAgIGNvbnN0IHRvZGF5T3JkaW5hbCA9IGRheU9yZGluYWwoeSwgbSwgdG9kYXkpOwogICAgY29uc3Qgd2Vla2RheU5hbWVzID0gWydNb24nLCAnVHVlJywgJ1dlZCcsICdUaHUnLCAnRnJpJywgJ1NhdCcsICdTdW4nXTsKCiAgICAkKCd3ZWVrVGl0bGUnKS50ZXh0Q29udGVudCA9IGBXZWVrICMke2lzb1dlZWsoeSwgbSwgdG9kYXkpfWA7CiAgICAkKCdtb250aFRpdGxlJykudGV4dENvbnRlbnQgPSBuZXcgSW50bC5EYXRlVGltZUZvcm1hdCgnZW4nLCB7CiAgICAgIHRpbWVab25lOiBUWiwgbW9udGg6ICdsb25nJwogICAgfSkuZm9ybWF0KG5vdyk7CiAgICAkKCd5ZWFyVGl0bGUnKS50ZXh0Q29udGVudCA9IFN0cmluZyh5KTsKCiAgICAvLyBNb250aCBhbmQgeWVhciBwcm9ncmVzcyBhZHZhbmNlIGNvbnRpbnVvdXNseSB3aXRoIHRoZSBsaXZlIGNsb2NrLgogICAgY29uc3QgbW9udGhUb3RhbERheXMgPSB1dGNEYXRlKHksIG0gKyAxLCAwKS5nZXRVVENEYXRlKCk7CiAgICBjb25zdCBtb250aFByb2dyZXNzID0gTWF0aC5tYXgoMCwgTWF0aC5taW4oMTAwLCAoKHRvZGF5IC0gMSArIGRheVByb2dyZXNzIC8gMTAwKSAvIG1vbnRoVG90YWxEYXlzKSAqIDEwMCkpOwogICAgY29uc3QgeWVhclN0YXJ0ID0gdXRjRGF0ZSh5LCAwLCAxKS5nZXRUaW1lKCk7CiAgICBjb25zdCBuZXh0WWVhclN0YXJ0ID0gdXRjRGF0ZSh5ICsgMSwgMCwgMSkuZ2V0VGltZSgpOwogICAgY29uc3QgZGF5T2ZZZWFyID0gTWF0aC5mbG9vcigodXRjRGF0ZSh5LCBtLCB0b2RheSkuZ2V0VGltZSgpIC0geWVhclN0YXJ0KSAvIDg2NDAwMDAwKSArIDE7CiAgICBjb25zdCBkYXlzSW5ZZWFyID0gTWF0aC5yb3VuZCgobmV4dFllYXJTdGFydCAtIHllYXJTdGFydCkgLyA4NjQwMDAwMCk7CiAgICBjb25zdCB5ZWFyUHJvZ3Jlc3MgPSBNYXRoLm1heCgwLCBNYXRoLm1pbigxMDAsICgoZGF5T2ZZZWFyIC0gMSArIGRheVByb2dyZXNzIC8gMTAwKSAvIGRheXNJblllYXIpICogMTAwKSk7CiAgICBjb25zdCBtb25kYXlPZmZzZXQgPSAodXRjRGF0ZSh5LCBtLCB0b2RheSkuZ2V0VVRDRGF5KCkgKyA2KSAlIDc7CiAgICBjb25zdCB3ZWVrUHJvZ3Jlc3MgPSBNYXRoLm1heCgwLCBNYXRoLm1pbigxMDAsICgobW9uZGF5T2Zmc2V0ICsgZGF5UHJvZ3Jlc3MgLyAxMDApIC8gNykgKiAxMDApKTsKICAgIFtbJ3dlZWsnLCB3ZWVrUHJvZ3Jlc3NdLCBbJ21vbnRoJywgbW9udGhQcm9ncmVzc10sIFsneWVhcicsIHllYXJQcm9ncmVzc11dLmZvckVhY2goKFtwZXJpb2QsIHZhbHVlXSkgPT4gewogICAgICBjb25zdCBmaWxsID0gJChgJHtwZXJpb2R9UHJvZ3Jlc3NGaWxsYCk7CiAgICAgIGNvbnN0IHRyYWNrID0gZmlsbC5wYXJlbnRFbGVtZW50OwogICAgICBmaWxsLnN0eWxlLndpZHRoID0gYCR7dmFsdWV9JWA7CiAgICAgIHRyYWNrLnNldEF0dHJpYnV0ZSgnYXJpYS12YWx1ZW5vdycsIHZhbHVlLnRvRml4ZWQoMSkpOwogICAgICAkKGAke3BlcmlvZH1Qcm9ncmVzc1ZhbHVlYCkudGV4dENvbnRlbnQgPSBgJHtNYXRoLnJvdW5kKHZhbHVlKX0lYDsKICAgIH0pOwoKICAgIC8vIE1vbmRheeKAk1N1bmRheSB3ZWVrLCB3aXRoIHBhc3QgZGF5cyBjb21wbGV0ZWQgYW5kIHRvZGF5IHNob3dpbmcgbGl2ZSBkYXkgcHJvZ3Jlc3MuCiAgICBjb25zdCBtb25kYXkgPSB1dGNEYXRlKHksIG0sIHRvZGF5IC0gbW9uZGF5T2Zmc2V0KTsKICAgICQoJ3dlZWtEYXlzJykuaW5uZXJIVE1MID0gd2Vla2RheU5hbWVzLm1hcCgobmFtZSwgaSkgPT4gewogICAgICBjb25zdCBkYXRlID0gbmV3IERhdGUobW9uZGF5KTsKICAgICAgZGF0ZS5zZXRVVENEYXRlKG1vbmRheS5nZXRVVENEYXRlKCkgKyBpKTsKICAgICAgY29uc3Qgb3JkaW5hbCA9IE1hdGguZmxvb3IoZGF0ZS5nZXRUaW1lKCkgLyA4NjQwMDAwMCk7CiAgICAgIGxldCBzdGF0dXMgPSAndXBjb21pbmcnLCBwcm9ncmVzcyA9IDA7CiAgICAgIGlmIChvcmRpbmFsIDwgdG9kYXlPcmRpbmFsKSBzdGF0dXMgPSAnY29tcGxldGUnOwogICAgICBlbHNlIGlmIChvcmRpbmFsID09PSB0b2RheU9yZGluYWwpIHsgc3RhdHVzID0gJ2N1cnJlbnQnOyBwcm9ncmVzcyA9IGRheVByb2dyZXNzOyB9CiAgICAgIHJldHVybiBgPGRpdiBjbGFzcz0iZGF5LWl0ZW0iPiR7cmluZyhzdGF0dXMsIHByb2dyZXNzLCBuYW1lKX08c3BhbiBjbGFzcz0iZGF5LWxhYmVsIj4ke25hbWV9PC9zcGFuPjwvZGl2PmA7CiAgICB9KS5qb2luKCcnKTsKCiAgICAvLyBSZWFsIGNhbGVuZGFyIG1vbnRoOiBhbGwgc2V2ZW4gd2Vla2RheXMsIGluY2x1ZGluZyBTYXR1cmRheXMsIGFuZCBjb3JyZWN0IGxlYWRpbmcvdHJhaWxpbmcgYmxhbmtzLgogICAgY29uc3QgZmlyc3RXZWVrZGF5ID0gKHV0Y0RhdGUoeSwgbSwgMSkuZ2V0VVRDRGF5KCkgKyA2KSAlIDc7CiAgICBjb25zdCBkYXlzSW5Nb250aCA9IHV0Y0RhdGUoeSwgbSArIDEsIDApLmdldFVUQ0RhdGUoKTsKICAgIGxldCBtb250aENlbGxzID0gJyc7CiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGZpcnN0V2Vla2RheTsgaSsrKSBtb250aENlbGxzICs9ICc8ZGl2IGNsYXNzPSJtb250aC1jZWxsIGVtcHR5Ij48L2Rpdj4nOwogICAgZm9yIChsZXQgZCA9IDE7IGQgPD0gZGF5c0luTW9udGg7IGQrKykgewogICAgICBjb25zdCBvcmRpbmFsID0gZGF5T3JkaW5hbCh5LCBtLCBkKTsKICAgICAgbGV0IHN0YXR1cyA9ICd1cGNvbWluZycsIHByb2dyZXNzID0gMDsKICAgICAgaWYgKG9yZGluYWwgPCB0b2RheU9yZGluYWwpIHN0YXR1cyA9ICdjb21wbGV0ZSc7CiAgICAgIGVsc2UgaWYgKG9yZGluYWwgPT09IHRvZGF5T3JkaW5hbCkgeyBzdGF0dXMgPSAnY3VycmVudCc7IHByb2dyZXNzID0gZGF5UHJvZ3Jlc3M7IH0KICAgICAgbW9udGhDZWxscyArPSBgPGRpdiBjbGFzcz0ibW9udGgtY2VsbCI+JHtyaW5nKHN0YXR1cywgcHJvZ3Jlc3MsIGBOb3ZlbWJlciAke2R9YCl9PHNwYW4gY2xhc3M9ImRhdGUtbnVtYmVyIj4ke3BhZChkKX08L3NwYW4+PC9kaXY+YDsKICAgIH0KICAgIGNvbnN0IHRvdGFsQ2VsbHMgPSBmaXJzdFdlZWtkYXkgKyBkYXlzSW5Nb250aDsKICAgIGNvbnN0IHRyYWlsaW5nID0gKDcgLSB0b3RhbENlbGxzICUgNykgJSA3OwogICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0cmFpbGluZzsgaSsrKSBtb250aENlbGxzICs9ICc8ZGl2IGNsYXNzPSJtb250aC1jZWxsIGVtcHR5Ij48L2Rpdj4nOwogICAgJCgnbW9udGhHcmlkJykuaW5uZXJIVE1MID0gbW9udGhDZWxsczsKCiAgICAvLyBZZWFyOiBlbGFwc2VkIG1vbnRocyBjb21wbGV0ZSwgY3VycmVudCBtb250aCBhZHZhbmNlcyB3aXRoIHRoZSBhY3R1YWwgZGF5LCBmdXR1cmUgbW9udGhzIGVtcHR5LgogICAgJCgneWVhckdyaWQnKS5pbm5lckhUTUwgPSBBcnJheS5mcm9tKHsgbGVuZ3RoOiAxMiB9LCAoXywgaSkgPT4gewogICAgICBjb25zdCBtb250aFN0YXJ0ID0gZGF5T3JkaW5hbCh5LCBpLCAxKTsKICAgICAgY29uc3QgbW9udGhEYXlzID0gdXRjRGF0ZSh5LCBpICsgMSwgMCkuZ2V0VVRDRGF0ZSgpOwogICAgICBjb25zdCBtb250aEVsYXBzZWQgPSBNYXRoLm1heCgwLCBNYXRoLm1pbihtb250aERheXMsIHRvZGF5KSk7CiAgICAgIGxldCBzdGF0dXMgPSAndXBjb21pbmcnLCBwcm9ncmVzcyA9IDA7CiAgICAgIGlmIChpIDwgbSkgc3RhdHVzID0gJ2NvbXBsZXRlJzsKICAgICAgZWxzZSBpZiAoaSA9PT0gbSkgewogICAgICAgIGlmICh0b2RheSA+PSBtb250aERheXMpIHN0YXR1cyA9ICdjb21wbGV0ZSc7CiAgICAgICAgZWxzZSB7IHN0YXR1cyA9ICdjdXJyZW50JzsgcHJvZ3Jlc3MgPSAoKCh0b2RheSAtIDEpICsgZGF5UHJvZ3Jlc3MgLyAxMDApIC8gbW9udGhEYXlzKSAqIDEwMDsgfQogICAgICB9CiAgICAgIGNvbnN0IGxhYmVsID0gbmV3IEludGwuRGF0ZVRpbWVGb3JtYXQoJ2VuJywgeyBtb250aDogJ3Nob3J0JywgdGltZVpvbmU6IFRaIH0pCiAgICAgICAgLmZvcm1hdCh1dGNEYXRlKHksIGksIDEpKTsKICAgICAgcmV0dXJuIGA8ZGl2IGNsYXNzPSJ5ZWFyLWl0ZW0iPiR7cmluZyhzdGF0dXMsIHByb2dyZXNzLCBsYWJlbCl9PHNwYW4gY2xhc3M9Im1vbnRoLWxhYmVsIj4ke2xhYmVsfTwvc3Bhbj48L2Rpdj5gOwogICAgfSkuam9pbignJyk7CiAgfQoKICBmdW5jdGlvbiB1cGRhdGUoKSB7CiAgICBjb25zdCBub3cgPSBuZXcgRGF0ZSgpOwogICAgY29uc3QgcCA9IHBhcnRzQXQobm93KTsKICAgIGNvbnN0IGhvdXIgPSBOdW1iZXIocC5ob3VyKSwgbWludXRlID0gTnVtYmVyKHAubWludXRlKSwgc2Vjb25kID0gTnVtYmVyKHAuc2Vjb25kKTsKICAgIGNvbnN0IHllYXIgPSBOdW1iZXIocC55ZWFyKSwgbW9udGggPSBOdW1iZXIocC5tb250aCkgLSAxLCBkYXkgPSBOdW1iZXIocC5kYXkpOwogICAgY29uc3QgZGF5UHJvZ3Jlc3MgPSAoKGhvdXIgKiAzNjAwICsgbWludXRlICogNjAgKyBzZWNvbmQpIC8gODY0MDApICogMTAwOwoKICAgIHJlZnJlc2hEYWlseUluc3BpcmF0aW9uKHllYXIsIG1vbnRoLCBkYXkpOwogICAgJCgnZGF0ZVRpdGxlJykudGV4dENvbnRlbnQgPSBkYXRlTGFiZWwobm93KTsKICAgIGNvbnN0IGhvdXIxMiA9IGhvdXIgJSAxMiB8fCAxMjsKICAgICQoJ2RpZ2l0YWxDbG9jaycpLmlubmVySFRNTCA9IGAke3BhZChob3VyMTIpfToke3BhZChtaW51dGUpfTo8c3BhbiBjbGFzcz0ic2Vjb25kcyI+JHtwYWQoc2Vjb25kKX08L3NwYW4+IDxzbWFsbD4ke2hvdXIgPj0gMTIgPyAnUE0nIDogJ0FNJ308L3NtYWxsPmA7CgogICAgLy8gQW5hbG9ndWUgY2xvY2sgaGFuZHMgZm9sbG93IHRoZSBzYW1lIGxpdmUgY2xvY2ssIGluY2x1ZGluZyBzbW9vdGggc2Vjb25kIG1vdmVtZW50LgogICAgY29uc3Qgc2Vjb25kQW5nbGUgPSBzZWNvbmQgKiA2OwogICAgY29uc3QgbWludXRlQW5nbGUgPSAobWludXRlICsgc2Vjb25kIC8gNjApICogNjsKICAgIGNvbnN0IGhvdXJBbmdsZSA9ICgoaG91ciAlIDEyKSArIG1pbnV0ZSAvIDYwICsgc2Vjb25kIC8gMzYwMCkgKiAzMDsKICAgIGNvbnN0IHBvaW50ID0gKGFuZ2xlLCByYWRpdXMpID0+ICh7CiAgICAgIHg6IDUwICsgTWF0aC5zaW4oYW5nbGUgKiBNYXRoLlBJIC8gMTgwKSAqIHJhZGl1cywKICAgICAgeTogNTAgLSBNYXRoLmNvcyhhbmdsZSAqIE1hdGguUEkgLyAxODApICogcmFkaXVzCiAgICB9KTsKICAgIGNvbnN0IGhwID0gcG9pbnQoaG91ckFuZ2xlLCAyMCksIG1wID0gcG9pbnQobWludXRlQW5nbGUsIDMxKSwgc3AgPSBwb2ludChzZWNvbmRBbmdsZSwgMzcpOwogICAgJCgnaG91ckhhbmQnKS5zZXRBdHRyaWJ1dGUoJ3gyJywgaHAueCk7CiAgICAkKCdob3VySGFuZCcpLnNldEF0dHJpYnV0ZSgneTInLCBocC55KTsKICAgICQoJ21pbnV0ZUhhbmQnKS5zZXRBdHRyaWJ1dGUoJ3gyJywgbXAueCk7CiAgICAkKCdtaW51dGVIYW5kJykuc2V0QXR0cmlidXRlKCd5MicsIG1wLnkpOwogICAgJCgnc2Vjb25kSGFuZCcpLnNldEF0dHJpYnV0ZSgneDInLCBzcC54KTsKICAgICQoJ3NlY29uZEhhbmQnKS5zZXRBdHRyaWJ1dGUoJ3kyJywgc3AueSk7CgogICAgLy8gVGhlIHRpbWVsaW5lIGlzIHByb3BvcnRpb25hbCB0byBlbGFwc2VkIHNlY29uZHMgaW4gdGhlIGFjdHVhbCAyNC1ob3VyIGRheS4KICAgICQoJ3RyYWNrRmlsbCcpLnN0eWxlLndpZHRoID0gYCR7ZGF5UHJvZ3Jlc3N9JWA7CiAgICAkKCdjdXJyZW50RG90Jykuc3R5bGUubGVmdCA9IGAke2RheVByb2dyZXNzfSVgOwogICAgJCgnY3VycmVudERvdCcpLnN0eWxlLmRpc3BsYXkgPSBkYXlQcm9ncmVzcyA+PSA5OS43ID8gJ25vbmUnIDogJ2Jsb2NrJzsKCiAgICAvLyBSZS1yZW5kZXIgcHJvZ3Jlc3MgaW5kaWNhdG9ycyBldmVyeSBtaW51dGUsIGFuZCBpbW1lZGlhdGVseSB3aGVuIHRoZSBkYXRlIGNoYW5nZXMuCiAgICBjb25zdCBjYWxlbmRhck1pbnV0ZSA9IGAke3llYXJ9LSR7bW9udGh9LSR7ZGF5fS0ke2hvdXJ9LSR7bWludXRlfWA7CiAgICBpZiAod2luZG93Ll9fY2FsZW5kYXJNaW51dGUgIT09IGNhbGVuZGFyTWludXRlKSB7CiAgICAgIHdpbmRvdy5fX2NhbGVuZGFyTWludXRlID0gY2FsZW5kYXJNaW51dGU7CiAgICAgIHJlbmRlckNhbGVuZGFycyhub3csIHAsIGRheVByb2dyZXNzKTsKICAgIH0gZWxzZSB7CiAgICAgIC8vIEtlZXAgdG9kYXkncyBwYXJ0aWFsIHJpbmdzIGluIHN5bmMgd2l0aCB0aGUgbGl2ZSBjbG9jay4KICAgICAgcmVuZGVyQ2FsZW5kYXJzKG5vdywgcCwgZGF5UHJvZ3Jlc3MpOwogICAgfQogIH0KCiAgLy8gR2VuZXJhdGUgYW5hbG9ndWUgY2xvY2sgbWludXRlIG1hcmtzIG9uY2UuCiAgY29uc3QgdGlja3MgPSAkKCdjbG9ja1RpY2tzJyk7CiAgZm9yIChsZXQgaSA9IDA7IGkgPCA2MDsgaSsrKSB7CiAgICBjb25zdCBhbmdsZSA9IGkgKiBNYXRoLlBJIC8gMzA7CiAgICBjb25zdCByMSA9IGkgJSA1ID09PSAwID8gMzkgOiA0MiwgcjIgPSA0NTsKICAgIGNvbnN0IGxpbmUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50TlMoJ2h0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnJywgJ2xpbmUnKTsKICAgIGxpbmUuc2V0QXR0cmlidXRlKCd4MScsIDUwICsgTWF0aC5zaW4oYW5nbGUpICogcjEpOwogICAgbGluZS5zZXRBdHRyaWJ1dGUoJ3kxJywgNTAgLSBNYXRoLmNvcyhhbmdsZSkgKiByMSk7CiAgICBsaW5lLnNldEF0dHJpYnV0ZSgneDInLCA1MCArIE1hdGguc2luKGFuZ2xlKSAqIHIyKTsKICAgIGxpbmUuc2V0QXR0cmlidXRlKCd5MicsIDUwIC0gTWF0aC5jb3MoYW5nbGUpICogcjIpOwogICAgbGluZS5zZXRBdHRyaWJ1dGUoJ3N0cm9rZS13aWR0aCcsIGkgJSA1ID09PSAwID8gMS41IDogLjcpOwogICAgdGlja3MuYXBwZW5kQ2hpbGQobGluZSk7CiAgfQoKICB1cGRhdGUoKTsKICBzZXRJbnRlcnZhbCh1cGRhdGUsIDEwMDApOwp9KSgpOwo8L3NjcmlwdD4KCjwvYm9keT4KPC9odG1sPg==";
let osDashboardFrameResizeBound = false;
function mountOSHomeDashboard(){
  const host=document.getElementById("osPage");
  host.classList.add("os-dashboard-host");
  host.replaceChildren();
  const frame=document.createElement("iframe");
  frame.className="os-home-dashboard-frame";
  frame.title="Personal OS Home Dashboard";
  frame.loading="eager";
  frame.setAttribute("scrolling","no");
  frame.srcdoc=new TextDecoder().decode(Uint8Array.from(atob(OS_HOME_DASHBOARD_B64),c=>c.charCodeAt(0)));
  const resizeFrame=()=>{
    try{
      const doc=frame.contentDocument;
      if(!doc) return;
      const light=document.body.classList.contains("light-mode");
      doc.documentElement.classList.toggle("light-mode",light);
      doc.body.classList.toggle("light-mode",light);
      frame.style.backgroundColor=light?"#e9edf2":"#050c13";
      const minHeight=window.matchMedia("(max-width:700px)").matches?620:720;
      const height=Math.max(minHeight,doc.documentElement.scrollHeight,doc.body?doc.body.scrollHeight:0);
      frame.style.height=(height+2)+"px";
    }catch(e){}
  };
  frame.addEventListener("load",()=>{
    resizeFrame();
    requestAnimationFrame(resizeFrame);
    setTimeout(resizeFrame,250);
  });
  host.appendChild(frame);
  if(!osDashboardFrameResizeBound){
    window.addEventListener("resize",()=>{
      const active=document.querySelector("#osPage .os-home-dashboard-frame");
      if(active){
        try{const d=active.contentDocument; if(d) active.style.height=(Math.max(window.matchMedia("(max-width:700px)").matches?620:720,d.documentElement.scrollHeight,d.body?d.body.scrollHeight:0)+2)+"px";}catch(e){}
      }
    });
    osDashboardFrameResizeBound=true;
  }
}
function selectOS(){
  document.body.classList.add("os-health-mode");
  osMode=true;
  document.querySelectorAll(".top-tab").forEach(x=>x.classList.remove("active"));
  document.querySelector(".os-tab").classList.add("active");
  document.getElementById("sidebarTitle").textContent="OVERVIEW";
  const sidebarItems=document.getElementById("sidebarItems");
  sidebarItems.innerHTML="";
  const timelineItem=addSidebarItem(sidebarItems,"Timeline",true,()=>{});
  timelineItem.setAttribute("aria-current","page");
  document.getElementById("systemPage").style.display="none";
  const osPage=document.getElementById("osPage");
  osPage.style.display="block";
  mountOSHomeDashboard();
}
function sidebarIcon(name){
  const paths={
    Overview:'<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
    Entry:'<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/>',
    Morning:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    Night:'<path d="M15 3.5A9 9 0 1 0 20.5 14 7 7 0 0 1 15 3.5z"/>',
    Sleep:'<path d="M3 18V10h8v8M11 14h8a2 2 0 0 1 2 2v2M3 18h18M7 10V8"/>',
    Workout:'<path d="M6 9v6M8 8v8M16 8v8M18 9v6M8 12h8"/>',
    Meditation:'<path d="M12 4c1.2 1.6 2 3.4 2 5.2 0 2.2-1 4-2 4s-2-1.8-2-4c0-1.8.8-3.6 2-5.2z"/><path d="M8 20c0-3 1.8-5 4-5s4 2 4 5"/>',
    Diet:'<path d="M12 21s-7-4.4-7-10a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 5.6-7 10-7 10z"/>',
    Scrolling:'<path d="M8 6 4 12l4 6M16 6l4 6-4 6"/>',
    Journaling:'<path d="M6 4h11a1 1 0 0 1 1 1v16H7a1 1 0 0 1-1-1V4z"/><path d="M9 4v16"/>',
    Reading:'<path d="M12 6c-2-1.4-5-1.6-8-.8v13c3-.8 6-.6 8 .8 2-1.4 5-1.6 8-.8V5.2c-3-.8-6-.6-8 .8z"/>',
    Calisthenics:'<path d="M9 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM15 11c-2 0-3 2-3 4v6M8 11h5l2 3"/>',
    NoPMO:'<path d="M12 3 5 6v6c0 5 3.2 8.2 7 9 3.8-.8 7-4 7-9V6z"/>',
    Errands:'<path d="M3 7h18v13H3z"/><path d="M8 7V4h8v3M3 12h18"/>',
    Wardrobe:'<path d="M4 9h16M12 9V5M8 5h8"/><path d="M7 9v11M17 9v11"/>',
    Laundry:'<rect x="4" y="3" width="16" height="18" rx="2"/><circle cx="12" cy="13" r="4"/><path d="M7 6h2"/>',
    Groceries:'<path d="M5 7h15l-1.5 9H8L5 7z"/><path d="M8 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM17 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM5 7 4 4"/>',
    "Room Cleaning":'<path d="M6 21 12 4l2 5M12 4c3 2 6 8 7 17"/>',
    Outcome:'<circle cx="12" cy="12" r="8"/><path d="M8 12h8M12 8v8"/>',
    Outcomes:'<circle cx="12" cy="12" r="8"/><path d="M8 12h8M12 8v8"/>',
    /* Domain Engine */
    Money:'<circle cx="12" cy="12" r="9"/><path d="M12 7v10M9.5 9.5c.6-1 1.6-1.5 2.5-1.5 1.4 0 2.5.8 2.5 2s-1.1 2-2.5 2h-1c-1.4 0-2.5.8-2.5 2s1.1 2 2.5 2c.9 0 1.9-.5 2.5-1.5"/>',
    Fitness:'<path d="M6 9v6M8 7v10M16 7v10M18 9v6M8 12h8"/><circle cx="4" cy="12" r="1.5"/><circle cx="20" cy="12" r="1.5"/>',
    Game:'<path d="M7 9a5 5 0 0 0 0 6h10a5 5 0 0 0 0-6H7z"/><path d="M9 11v2M8 12h2M15.5 11.5h.01M17.5 12.5h.01"/>',
    Writing:'<path d="M4 20h4l10-10a2.1 2.1 0 0 0-3-3L5 17v3z"/><path d="M13.5 7.5l3 3"/>',
    Speaking:'<path d="M12 3a4 4 0 0 1 4 4v4a4 4 0 0 1-8 0V7a4 4 0 0 1 4-4z"/><path d="M5 12a7 7 0 0 0 14 0M12 19v2M9 21h6"/>',
    Upskilling:'<path d="M12 3 3 8l9 5 9-5-9-5z"/><path d="M3 12l9 5 9-5M3 16l9 5 9-5"/>',
    Projects:'<path d="M9 4h6l1 2h4v14H4V6h4l1-2z"/><path d="M9 12h6M9 15h4"/>'
  };
  return `<span class="item-icon"><svg viewBox="0 0 24 24">${paths[name]||'<circle cx="12" cy="12" r="3"/>'}</svg></span>`;
}
function addSidebarItem(container, label, active, onclick){
  const button=document.createElement("button");
  button.className="item"+(active?" active":"");
  button.innerHTML=sidebarIcon(label)+`<span>${label}</span>`;
  button.onclick=onclick;
  container.appendChild(button);
  return button;
}
function renderSidebar(){
  const container=document.getElementById("sidebarItems");
  document.getElementById("sidebarTitle").textContent="OVERVIEW";
  container.innerHTML="";
  if(osMode) return;
  addSidebarItem(container,"Overview",workspaceMode==="overview",()=>selectItem(0));
  if(currentLayer!==4 && currentLayer!==3){
    const entry=addSidebarItem(container,"Entry",workspaceMode==="entry",()=>selectEntry());
    entry.classList.add("entry-item");
    entry.id="sidebarEntry";
  }
  if(currentLayer===1){
    let offset=1;
    personalGroups.forEach((group,groupIndex)=>{
      if(group.title){
        const label=document.createElement("div");
        label.className="sidebar-group";
        label.textContent=group.title;
        container.appendChild(label);
      }
      group.blocks.forEach((block,blockIndex)=>{
        if(blockIndex || groupIndex){
          const line=document.createElement("div");
          line.className="divider";
          container.appendChild(line);
        }
        block.forEach(name=>{
          const index=offset++;
          if(name==="Errands"){
            const parent=addSidebarItem(container,"Errands",workspaceMode==="system"&&index===currentItem,()=>{
              errandsExpanded=!errandsExpanded;
              selectItem(index);
            });
            parent.setAttribute("aria-expanded",String(errandsExpanded));
            parent.title=errandsExpanded?"Hide Errands items":"Show Errands items";
            if(errandsExpanded){
              errandsChildren.forEach(childName=>{
                const childIndex=personalSidebarItems.indexOf(childName)+1;
                const child=addSidebarItem(container,childName,workspaceMode==="system"&&childIndex===currentItem,()=>selectItem(childIndex));
                child.style.marginLeft="14px";
                child.style.width="calc(100% - 14px)";
              });
            }
          }else{
            addSidebarItem(container,name,workspaceMode==="system"&&index===currentItem,()=>selectItem(index));
          }
        });
      });
    });
    return;
  }
  if(currentLayer===2){
    let offset=1;
    productivityGroups.forEach((group,groupIndex)=>{
      if(groupIndex){
        const line=document.createElement("div");
        line.className="divider";
        container.appendChild(line);
      }
      group.blocks.forEach(block=>{
        block.forEach(name=>{
          const index=offset++;
          addSidebarItem(container,name,workspaceMode==="system"&&index===currentItem,()=>selectItem(index));
        });
      });
    });
    return;
  }
  if(currentLayer===3){
    let offset=1;
    const overviewDivider=document.createElement("div");
    overviewDivider.className="divider";
    container.appendChild(overviewDivider);
    domainGroups.forEach((group,groupIndex)=>{
      if(groupIndex){
        const line=document.createElement("div");
        line.className="divider";
        container.appendChild(line);
      }
      group.blocks.forEach(block=>{
        block.forEach(name=>{
          const index=offset++;
          addSidebarItem(container,name,workspaceMode==="system"&&index===currentItem,()=>selectItem(index));
        });
      });
    });
    return;
  }
  const divider=document.createElement("div"); divider.className="divider"; container.appendChild(divider);
  layerItems[currentLayer].forEach((name,index)=>{
    addSidebarItem(container, name, index+1===currentItem, ()=>selectItem(index+1));
  });
}
function selectEntry(){
  if(currentLayer===3){ selectDomainSection("entry"); return; }
  workspaceMode="entry";
  currentPage="entry";
  currentItem=0;
  document.getElementById("dashboardTab").classList.remove("active");
  document.getElementById("analyticsTab").classList.remove("active");
  renderSidebar(); renderWorkspace();
}
function selectOutcome(){
  workspaceMode="outcomes";
  currentPage="dashboard";
  currentItem=0;
  document.getElementById("dashboardTab").classList.add("active");
  document.getElementById("analyticsTab").classList.remove("active");
  renderSidebar(); renderWorkspace();
}
function selectItem(item){
  currentItem=item;
  if(currentLayer===3 && item>0){
    domainSection="entry";
    workspaceMode="system";
    currentPage="entry";
    document.getElementById("dashboardTab").classList.remove("active");
    document.getElementById("analyticsTab").classList.remove("active");
    renderSidebar();
    selectDomainSection("entry");
    return;
  }
  workspaceMode=item===0?"overview":"system";
  currentPage=item===0?"entry":"dashboard";
  document.getElementById("dashboardTab").classList.toggle("active", item>0);
  document.getElementById("analyticsTab").classList.remove("active");
  renderSidebar(); renderWorkspace();
}


function overviewConfig(layer){
  if(layer===1){
    return {
      title:"Personal Engine Overview",
      sub:"Current health score for each system",
      systems:[
        ["Sleep",82,"Healthy","today","green"],
        ["Workout",91,"Excellent","today","green"],
        ["Meditation",68,"Needs Attention","2 days ago","yellow"],
        ["Diet",74,"Stable","today","blue"],
        ["Journaling",55,"Critical","3 days ago","red"],
        ["NoPMO",88,"Strong","today","green"]
      ],
      execution:84,
      executionDelta:"+8%",
      health:78,
      healthDelta:"+12%",
      trend:[70,76,64,82,79,88,91],
      activity:[
        ["☾","Sleep","7.5 hours · Good quality","Today, 7:30 AM"],
        ["✚","Workout","Upper body · 45 mins","Today, 6:45 AM"],
        ["◉","Diet","Tracked 2 meals","Today, 1:20 PM"],
        ["◌","Meditation","10 minutes","Yesterday, 10:12 PM"],
        ["▤","Journaling","Daily entry","Sep 7, 11:05 PM"],
        ["∞","NoPMO","Day 12","Today"]
      ]
    };
  }
  if(layer===2){
    return {
      title:"Productivity Engine Overview",
      sub:"Current health score for each system",
      systems:[
        ["Day",84,"Healthy","today","green"],
        ["Week",91,"Excellent","this week","green"],
        ["Bi-week",76,"Stable","this period","blue"],
        ["Month",88,"Strong","this month","green"],
        ["Quarter",72,"Stable","this quarter","blue"],
        ["Bi-Quarter",81,"Healthy","this period","green"],
        ["Year",93,"Excellent","this year","green"]
      ],
      execution:86,
      executionDelta:"+11%",
      health:83,
      healthDelta:"+9%",
      trend:[68,72,77,74,82,86,91],
      activity:[
        ["D","Day","6 / 8 planned actions completed","Today"],
        ["W","Week","27 / 32 weekly actions completed","This week"],
        ["B","Bi-week","Execution at 76%","Current period"],
        ["M","Month","Strong monthly consistency","Current month"],
        ["Q","Quarter","72% of planned outcomes tracked","Current quarter"],
        ["Y","Year","93% system consistency","Current year"]
      ]
    };
  }
  if(layer===3){
    return {
      title:"Domain Engine Overview",
      sub:"Current health score for each system",
      systems:[
        ["Money",71,"Stable","today","blue"],
        ["Fitness",86,"Healthy","today","green"],
        ["Game",64,"Needs Attention","3 days ago","yellow"],
        ["Writing",73,"Stable","yesterday","blue"],
        ["Speaking",91,"Excellent","today","green"],
        ["Upskilling",79,"Healthy","today","green"],
        ["Projects",68,"Stable","today","blue"]
      ],
      execution:79,
      executionDelta:"+6%",
      health:77,
      healthDelta:"+7%",
      trend:[61,68,66,72,70,76,84],
      activity:[
        ["$","Money","Weekly business review completed","Today"],
        ["+","Fitness","Workout and walk logged","Today"],
        ["♡","Game","2 social activities tracked","Yesterday"],
        ["L","Upskilling","45 min learning session","Yesterday"],
        ["W","Writing","Writing practice completed","Sep 8"],
        ["S","Speaking","Speaking practice completed","Sep 7"]
      ]
    };
  }
  return {
    title:"Life Engine Overview",
    sub:"Life Engine is ready to be configured",
    systems:[],
    execution:0,
    executionDelta:"—",
    health:0,
    healthDelta:"—",
    trend:[],
    activity:[]
  };
}

function healthClass(score){
  if(score>=85) return "status-healthy";
  if(score>=70) return "status-stable";
  if(score>=60) return "status-attention";
  return "status-critical";
}
function healthColorClass(score){
  if(score>=85) return "green";
  if(score>=70) return "blue";
  if(score>=60) return "warn";
  return "critical";
}
function overviewDonut(score, innerLabel){
  const deg=Math.max(0,Math.min(100,score))*3.6;
  return `<div class="donut" style="background:conic-gradient(#4fd18a 0deg ${deg}deg,#2a3038 ${deg}deg 360deg)">
    <div class="donut-center"><span class="donut-value">${score}%</span><span class="donut-label">${innerLabel}</span></div>
  </div>`;
}
function overviewStatusCounts(systems){
  const healthy=systems.filter(s=>s[2]==="Healthy"||s[2]==="Excellent"||s[2]==="Strong").length;
  const attention=systems.filter(s=>s[2]==="Needs Attention").length;
  const critical=systems.filter(s=>s[2]==="Critical").length;
  return {healthy,attention,critical};
}
function renderTrendSVG(values){
  const max=100,min=0;
  const pts=values.map((v,i)=>{
    const x=(i/(values.length-1))*100;
    const y=100-((v-min)/(max-min))*100;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  const area=`0,100 ${pts} 100,100`;
  return `<svg class="trend-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
    <polygon points="${area}" fill="rgba(73,133,218,.14)"></polygon>
    <polyline points="${pts}" fill="none" stroke="#5ca4f5" stroke-width="1.6" vector-effect="non-scaling-stroke"></polyline>
    ${values.map((v,i)=>{
      const x=(i/(values.length-1))*100,y=100-v;
      return `<circle cx="${x}" cy="${y}" r="1.6" fill="#5ca4f5"></circle>`;
    }).join("")}
  </svg>`;
}
function clampScore(n){return Math.max(0,Math.min(100,n));}
function healthBand(score){
  if(score>=80) return "excellent";
  if(score>=60) return "good";
  if(score>=40) return "okay";
  if(score>=20) return "attention";
  return "critical";
}
function sleepWakeScore(wakeTime){
  const wakeIndex=sleepWakeTimes.indexOf(wakeTime||"");
  if(wakeIndex<0) return 0;
  return clampScore(100-(wakeIndex/(sleepWakeTimes.length-1))*100);
}
function scoreSystemDay(systemName, entry){
  if(!entry) return 0;
  if(systemName==="Sleep"){
    const hours=Number(entry.hours);
    let duration=0;
    if(!Number.isNaN(hours)){
      if(hours>=7 && hours<=9) duration=100;
      else if(hours<7) duration=clampScore((hours/7)*100);
      else duration=clampScore(100-(hours-9)*15);
    }
    const quality=entry.quality? (Number(entry.quality)/5)*100 : 0;
    return clampScore(quality*0.5 + duration*0.3 + sleepWakeScore(entry.wakeTime)*0.2);
  }
  if(systemName==="Workout"){
    let score=0;
    if(entry.gym==="yes") score+=55;
    if(entry.cardio==="yes"){
      const mins=Number(entry.cardioTime||0);
      score+=clampScore(Math.max(15,(mins/60)*45));
    }
    return clampScore(score);
  }
  if(systemName==="Meditation"){
    let score=0;
    if(entry.morning==="yes") score+=40+clampScore((Number(entry.morningTime||0)/20)*10);
    if(entry.night==="yes") score+=40+clampScore((Number(entry.nightTime||0)/20)*10);
    return clampScore(score);
  }
  if(entry.value==="yes") return 100;
  if(entry.value==="off") return null;
  if(entry.value==="no") return 0;
  return 0;
}
function isOverviewOffDay(systemName, entry){
  if(!entry) return false;
  if(entry.value==="off") return true;
  if(systemName==="Workout" && entry.gym==="off" && (entry.cardio==="off"||!entry.cardio)) return true;
  return false;
}
function overviewSystemBlocks(layer){
  if(layer===1) return personalGroups[0].blocks;
  return [layerItems[layer]||[]];
}
async function loadLayerHealthScores(layer, days=overviewRangeDays){
  const systems=overviewSystemBlocks(layer).flat();
  const dates=getDateRange(days);
  return Promise.all(systems.map(async name=>{
    const data=await getEntries(name,dates[0],dates[dates.length-1]);
    let total=0, counted=0, logged=0;
    dates.forEach(date=>{
      const entry=data[date];
      if(!entry) return;
      logged+=1;
      if(isOverviewOffDay(name,entry)) return;
      total+=scoreSystemDay(name,entry)||0;
      counted+=1;
    });
    return {name, health:counted?Math.round(total/counted):0, logged};
  }));
}
async function setOverviewRange(days){
  overviewRangeDays=days;
  await renderEngineOverview();
}
function healthCardMarkup(barsId, labelsId, withViews=false){
  const views=withViews?`<div class="chart-view-toggle">
          <button class="view-btn${outcomeChartView==="bars"?" active":""}" onclick="setOutcomeChartView('bars')" title="Bar chart">
            <svg viewBox="0 0 24 24"><path d="M5 20V10M12 20V4M19 20v-7"/></svg>
          </button>
          <button class="view-btn${outcomeChartView==="line"?" active":""}" onclick="setOutcomeChartView('line')" title="Line graph">
            <svg viewBox="0 0 24 24"><path d="M4 16l5-5 4 3 7-8"/><path d="M4 20h16"/></svg>
          </button>
          <button class="view-btn outcome-progress-btn" onclick="selectOutcome()" title="Outcome progress">
            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 8 8"/><path d="M12 8v4l3 2"/></svg>
          </button>
        </div>`:"";
  return `<div class="health-card">
      <div class="health-card-head">
        <div>
          <div class="focus-toggle">
            <button class="focus-btn${overviewFocus==="system"?" active":""}" onclick="setOverviewFocus('system')">System</button>
            ${currentLayer===1||currentLayer===2?`<button class="focus-btn${overviewFocus==="outcome"?" active":""}" onclick="setOverviewFocus('outcome')">Outcome</button>`:""}
          </div>
          ${views}
        </div>
        <div class="range-toggle">
          <button class="range-btn${overviewRangeDays===7?" active":""}" onclick="setOverviewRange(7)">Last 7 days</button>
          <button class="range-btn${overviewRangeDays===30?" active":""}" onclick="setOverviewRange(30)">Last 30 days</button>
        </div>
      </div>
      <div class="health-chart">
        <div class="health-y"><span>100%</span><span>80%</span><span>60%</span><span>40%</span><span>20%</span><span>0%</span></div>
        <div class="health-plot${withViews&&outcomeChartView==="line"?" line-mode":""}" id="${withViews?"outcomePlot":""}">
          <div class="health-bands">
            <div class="health-band excellent"></div>
            <div class="health-band good"></div>
            <div class="health-band okay"></div>
            <div class="health-band attention"></div>
            <div class="health-band critical"></div>
          </div>
          <div class="health-bars" id="${barsId}"></div>
          ${withViews?`<div class="outcome-line-wrap"><svg id="outcomeLineSvg" viewBox="0 0 100 100" preserveAspectRatio="none"></svg></div>`:""}
          <div class="health-x" id="${labelsId}"></div>
        </div>
      </div>
    </div>`;
}
function setOverviewFocus(focus){
  overviewFocus=focus;
  renderEngineOverview();
}
function setOutcomeChartView(view){
  outcomeChartView=view;
  renderEngineOverview();
}
function outcomeScoresFromEntry(entry){
  if(!entry) return null;
  if(entry.scores && typeof entry.scores==="object") return entry.scores;
  return entry;
}
function outcomePointHealth(name, raw, tone){
  if(raw==null || raw==="") return null;
  const n=Number(raw);
  if(Number.isNaN(n)) return null;
  const level=Number(normalizeOutcomeScore(n));
  if(!level) return null;
  return clampScore(level*20);
}
function groupAverageForDay(items, scores, tone){
  if(!scores) return null;
  const vals=items.map(name=>outcomePointHealth(name, scores[name], tone)).filter(v=>v!=null);
  if(!vals.length) return null;
  return vals.reduce((a,b)=>a+b,0)/vals.length;
}
function lineSegments(values){
  const n=values.length;
  const segs=[], cur=[];
  values.forEach((v,i)=>{
    if(v==null){
      if(cur.length>1) segs.push(cur.slice());
      cur.length=0;
      return;
    }
    const x=n===1?50:(i/(n-1))*100;
    const y=100-Math.max(0,Math.min(100,v));
    cur.push(`${x.toFixed(2)},${y.toFixed(2)}`);
  });
  if(cur.length>1) segs.push(cur);
  return segs.map(seg=>`M ${seg.join(" L ")}`).join(" ");
}
async function renderOutcomeLineChart(){
  const dates=getDateRange(overviewRangeDays);
  const data=await getEntries(currentOutcomeSystem(),dates[0],dates[dates.length-1]);
  const groups=currentOutcomeGroups();
  const good=groups[0].items, bad=groups[1].items, focus=(groups[2]&&groups[2].items)||[];
  const series={
    good:dates.map(d=>groupAverageForDay(good,outcomeScoresFromEntry(data[d]),"good")),
    bad:dates.map(d=>groupAverageForDay(bad,outcomeScoresFromEntry(data[d]),"bad")),
    focus:dates.map(d=>groupAverageForDay(focus,outcomeScoresFromEntry(data[d]),"focus"))
  };
  const svg=document.getElementById("outcomeLineSvg");
  const labels=document.getElementById("outcomeLabels");
  if(!svg) return;
  const palette={good:"#55e3a1",bad:"#f0707e",focus:"#9b8cff"};
  const dots=dates.map((date,i)=>{
    const x=dates.length===1?50:(i/(dates.length-1))*100;
    return Object.entries(palette).map(([key,color])=>{
      const v=series[key][i];
      if(v==null) return "";
      const y=(100-v).toFixed(2);
      return `<circle class="neon-dot-glow" cx="${x.toFixed(2)}" cy="${y}" r="1.05" fill="${color}"></circle>
              <circle class="neon-dot" cx="${x.toFixed(2)}" cy="${y}" r="0.62" fill="${color}" color="${color}"></circle>
              <circle class="neon-dot-highlight" cx="${x.toFixed(2)}" cy="${y}" r="0.16" fill="#ffffff" opacity=".72"></circle>`;
    }).join("");
  }).join("");
  const seriesMarkup=Object.entries(palette).map(([key,color])=>{
    const d=lineSegments(series[key]);
    if(!d) return "";
    return `<path class="neon-glow" d="${d}" fill="none" stroke="${color}" stroke-width="2.8" stroke-linecap="butt" stroke-linejoin="miter" vector-effect="non-scaling-stroke" filter="url(#neonBlur)"></path>
            <path class="neon-core" d="${d}" fill="none" stroke="${color}" stroke-width="1.15" stroke-linecap="butt" stroke-linejoin="miter" vector-effect="non-scaling-stroke"></path>`;
  }).join("");
  svg.innerHTML=`
    <defs>
      <filter id="neonBlur" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="0.9"></feGaussianBlur>
      </filter>
    </defs>
    ${seriesMarkup}
    ${dots}`;
  if(labels){
    labels.innerHTML=dates.map(date=>{
      const d=new Date(date+"T00:00:00");
      return `<span>${d.getDate()}</span>`;
    }).join("");
  }
}
function paintHealthChart(barsId, labelsId, scores, blocks){
  const byName=Object.fromEntries(scores.map(s=>[s.name,s]));
  const bars=document.getElementById(barsId);
  const labels=document.getElementById(labelsId);
  if(!bars||!labels) return;
  bars.innerHTML=blocks.map((block,index)=>{
    const cols=block.map(name=>{
      const s=byName[name]||{name,health:0,logged:0};
      const band=healthBand(s.health);
      return `<div class="health-bar-col">
        <div class="health-bar ${band}" style="height:${Math.max(s.health,2)}%">
          <span class="health-bar-value">${s.health}%</span>
        </div>
      </div>`;
    }).join("");
    return (index?`<div class="health-bar-gap"></div>`:"")+cols;
  }).join("");
  labels.innerHTML=blocks.map((block,index)=>{
    const names=block.map(name=>{
      const s=byName[name]||{logged:0};
      return `<span title="${s.logged} of ${overviewRangeDays} days logged">${name}</span>`;
    }).join("");
    return (index?`<span class="gap"></span>`:"")+names;
  }).join("");
}
async function loadOutcomeHealthScores(days=overviewRangeDays){
  const dates=getDateRange(days);
  const data=await getEntries(currentOutcomeSystem(),dates[0],dates[dates.length-1]);
  const tone={};
  currentOutcomeGroups().forEach(group=>group.items.forEach(name=>tone[name]=group.tone));
  return currentOutcomeGroups().flatMap(group=>group.items).map(name=>{
    let total=0, counted=0;
    dates.forEach(date=>{
      const raw=data[date]?.scores?.[name];
      if(raw==null || raw==="") return;
      const n=Number(raw);
      if(Number.isNaN(n)) return;
      const level=Number(normalizeOutcomeScore(n));
      total+=clampScore(level*20);
      counted+=1;
    });
    return {name, health:counted?Math.round(total/counted):0, logged:counted};
  });
}
async function renderEngineOverview(){
  if(currentLayer===4){
    document.getElementById("overviewPage").innerHTML=`<div class="placeholder"><strong>Life Engine</strong>Life Engine is ready to be configured.</div>`;
    return;
  }
  const showOutcome=(currentLayer===1||currentLayer===2) && overviewFocus==="outcome";
  document.getElementById("overviewPage").innerHTML=`<div class="health-stack">
    ${healthCardMarkup(showOutcome?"outcomeBars":"healthBars", showOutcome?"outcomeLabels":"healthLabels", showOutcome)}
  </div>`;
  if(showOutcome){
    if(outcomeChartView==="line") await renderOutcomeLineChart();
    else{
      const outcomeScores=await loadOutcomeHealthScores(overviewRangeDays);
      paintHealthChart("outcomeBars","outcomeLabels",outcomeScores,currentOutcomeGroups().map(group=>group.items));
    }
    return;
  }
  const scores=await loadLayerHealthScores(currentLayer, overviewRangeDays);
  paintHealthChart("healthBars","healthLabels",scores,overviewSystemBlocks(currentLayer));
}


function hideWorkspacePages(){
  ["todayPage","dashboardPage","analyticsPage","workoutPage","meditationPage","simpleTrackerPage","engineDashboardPage","placeholderPage","overviewPage","entryHubPage","systemDefinitionPage","mobileHomePage","gameDomainPage"].forEach(id=>{
    const el=document.getElementById(id); if(el) el.style.display="none";
  });
}
let domainSection="dashboard";
async function selectDomainSection(section){
  domainSection=section;
  const isDomain = currentLayer===3 && currentItem>0;
  document.querySelectorAll("#domainSectionNav .domain-section-btn").forEach(btn=>{
    btn.classList.toggle("active", btn.dataset.domainSection===section);
  });
  if(section==="definition" && isDomain){
    definitionSystem=(layerItems[3]||[])[currentItem-1]||"Money";
    workspaceMode="system";
    currentPage="definition";
    document.getElementById("dashboardTab").classList.remove("active");
    document.getElementById("analyticsTab").classList.remove("active");
    hideWorkspacePages();
    document.getElementById("placeholderPage").style.display="block";
    document.getElementById("genericPlaceholderContent").style.display="none";
    document.getElementById("domainSectionNav").style.display="flex";
    const panel=document.getElementById("domainSectionPanel");
    panel.style.display="block";
    panel.classList.add("is-definition");
    document.getElementById("domainSectionTitle").style.display="none";
    document.getElementById("domainSectionDescription").style.display="none";
    document.getElementById("domainDefinitionEditor").style.display="flex";
    document.getElementById("workspaceTitle").textContent=definitionSystem;
    document.getElementById("workspaceSub").textContent="";
    const rows=await getEntries(definitionSystem,DEFINITION_DATE,DEFINITION_DATE);
    const saved=rows[DEFINITION_DATE];
    document.getElementById("domainDefinitionText").value=saved?.text||(Array.isArray(saved?.bullets)?saved.bullets.join("\n"):"");
    const btn=document.getElementById("saveDomainDefinitionBtn");
    if(btn) btn.classList.remove("saved");
    return;
  }
  const editor=document.getElementById("domainDefinitionEditor");
  if(editor) editor.style.display="none";
  const panel=document.getElementById("domainSectionPanel");
  if(panel) panel.classList.remove("is-definition");
  const generic=document.getElementById("genericPlaceholderContent");
  if(generic) generic.style.display="block";
  // Undeveloped Entry/Dashboard stay empty
  document.getElementById("domainSectionTitle").style.display="none";
  document.getElementById("domainSectionDescription").style.display="none";
  workspaceMode="system";
  currentPage=section;
  document.getElementById("dashboardTab").classList.toggle("active",section==="dashboard");
  document.getElementById("analyticsTab").classList.remove("active");
  renderSidebar();
  renderWorkspace();
}
async function renderWorkspace(){
  if(osMode || !currentUser) return;
  const systemPage=document.getElementById("systemPage");
  const domainShell=document.getElementById("domainWorkspaceShell");
  if(domainShell) domainShell.classList.toggle("is-domain-active", currentLayer===3);
  if(systemPage) systemPage.classList.toggle("outcome-fit", workspaceMode==="outcomes");
  const enginePage=document.getElementById("engineDashboardPage");
  if(enginePage && workspaceMode!=="outcomes") enginePage.classList.remove("outcome-mode");
  document.getElementById("osPage").style.display="none";
  document.getElementById("systemPage").style.display="block";
  const systemName=currentItem>=1?personalSystemName(currentItem):null;
  const isSleep=currentLayer===1 && systemName==="Sleep";
  hideWorkspacePages();
  if(workspaceMode==="overview" || (workspaceMode!=="entry" && workspaceMode!=="outcomes" && currentItem===0 && workspaceMode!=="system")){
    document.getElementById("overviewPage").style.display="block";
    document.getElementById("workspaceTitle").textContent=overviewConfig(currentLayer).title;
    document.getElementById("workspaceSub").textContent="";
    await renderEngineOverview();
    return;
  }
  if(workspaceMode==="entry"){
    document.getElementById("entryHubPage").style.display="block";
    document.getElementById("workspaceTitle").textContent="Entry";
    document.getElementById("workspaceSub").textContent="";
    await renderDateStrip("entryHubDateStrip");
    await loadEntryHub();
    return;
  }
  if(workspaceMode==="outcomes"){
    document.getElementById("engineDashboardPage").style.display="block";
    document.getElementById("workspaceTitle").textContent="Outcome Dashboard";
    document.getElementById("workspaceSub").textContent="";
    await renderOutcomeDashboard();
    return;
  }
  if(currentPage==="definition"){
    await openSystemDefinition(systemName||definitionSystem||currentEntrySystem());
    return;
  }
  const isWorkout=currentLayer===1 && systemName==="Workout";
  const isMeditation=currentLayer===1 && systemName==="Meditation";
  const isSimpleTracker=currentLayer===1 && systemName && !configuredTrackers.includes(systemName);
  ["todayPage","dashboardPage","analyticsPage","workoutPage","meditationPage","simpleTrackerPage","engineDashboardPage","placeholderPage","systemDefinitionPage","mobileHomePage","gameDomainPage"].forEach(id=>{const el=document.getElementById(id);if(el)el.style.display="none";});
  if(isSleep){
    document.getElementById("workspaceTitle").textContent="Sleep System";
    document.getElementById("workspaceSub").textContent="";
    if(currentPage==="entry") document.getElementById("todayPage").style.display="block";
    else if(currentPage==="dashboard") document.getElementById("dashboardPage").style.display="block";
    else document.getElementById("analyticsPage").style.display="block";
    await renderDateStrip("dateStrip"); await loadSelectedDate();
    if(currentPage==="dashboard"||currentPage==="analytics") await renderDashboard();
  }else if(isWorkout){
    document.getElementById("workspaceTitle").textContent="Workout"; document.getElementById("workspaceSub").textContent="";
    if(currentPage==="entry"){document.getElementById("workoutPage").style.display="block";await renderDateStrip("workoutDateStrip");await loadWorkoutDate();}
    else{document.getElementById("engineDashboardPage").style.display="block";await renderEngineDashboard("Workout");}
  }else if(isMeditation){
    document.getElementById("workspaceTitle").textContent="Meditation"; document.getElementById("workspaceSub").textContent="";
    if(currentPage==="entry"){document.getElementById("meditationPage").style.display="block";await renderDateStrip("meditationDateStrip");await loadMeditationDate();}
    else{document.getElementById("engineDashboardPage").style.display="block";await renderEngineDashboard("Meditation");}
  }else if(isSimpleTracker){
    document.getElementById("workspaceTitle").textContent=systemName;
    document.getElementById("workspaceSub").textContent="";
    if(currentPage==="entry"){
      document.getElementById("simpleTrackerQuestion").textContent=simpleTrackerQuestion(systemName);
      document.getElementById("simpleTrackerPage").style.display="block";
      await renderDateStrip("simpleDateStrip");
      await loadSimpleTrackerDate(systemName);
    }else{
      document.getElementById("engineDashboardPage").style.display="block";
      await renderEngineDashboard(systemName);
    }
  }else{
    // Productivity Engine + Domain Engine systems (and any unconfigured systems).
    const name=systemName||(layerItems[currentLayer]||[])[currentItem-1]||"System";
    document.getElementById("placeholderPage").style.display="block";
    if(currentLayer===3){
      const nav=document.getElementById("domainSectionNav");
      const panel=document.getElementById("domainSectionPanel");
      const generic=document.getElementById("genericPlaceholderContent");
      const editor=document.getElementById("domainDefinitionEditor");
      const title=document.getElementById("domainSectionTitle");
      const description=document.getElementById("domainSectionDescription");
      nav.style.display="flex";
      document.querySelectorAll("[data-domain-section]").forEach(btn=>btn.classList.toggle("active",btn.dataset.domainSection===domainSection));
      document.getElementById("workspaceTitle").textContent=name;
      document.getElementById("workspaceSub").textContent="";
      // Definition only — full editor. Entry/Dashboard stay empty placeholders.
      if(domainSection==="definition"){
        panel.style.display="block";
        panel.classList.add("is-definition");
        generic.style.display="none";
        if(editor) editor.style.display="flex";
        if(title) title.style.display="none";
        if(description) description.style.display="none";
        return;
      }
      if(editor) editor.style.display="none";
      panel.style.display="block";
      panel.classList.remove("is-definition");
      generic.style.display="none";
      // Undeveloped Entry/Dashboard stay empty — no placeholder copy
      if(title) title.style.display="none";
      if(description) description.style.display="none";
      return;
    }
    document.getElementById("domainSectionNav").style.display="none";
    document.getElementById("domainSectionPanel").style.display="none";
    document.getElementById("genericPlaceholderContent").style.display="block";
    document.getElementById("placeholderTitle").textContent=name;
    document.getElementById("workspaceTitle").textContent=name;
    document.getElementById("workspaceSub").textContent="";
    const body=document.getElementById("placeholderBody");
    if(body){
      body.textContent=currentLayer===2
        ? "Define this productivity system, then use Entry to log outcomes."
        : currentLayer===3
          ? "Define this domain system. Tracking can be configured later."
          : "This system workspace is ready to be configured. Open System Definition to describe what this system is.";
    }
  }
}

function bandFromHours(hours){
  const h=Number(hours);
  if(Number.isNaN(h)) return "";
  if(h<4) return "below4";
  if(h<5) return "4to5";
  if(h<6) return "5to6";
  if(h<7) return "6to7";
  if(h<=8) return "7to8";
  return "8plus";
}
function resolveSleepBand(entry){
  const key=entry?.durationBand||"";
  if(sleepDurationBands[key]) return key;
  if(key==="4to6") return Number(entry?.hours)>=5.5?"5to6":"4to5";
  return bandFromHours(entry?.hours);
}
function notionPill(label, pillClass){
  return `<span class="notion-pill ${pillClass}">${label}</span>`;
}
function closeNotionSelects(exceptId){
  document.querySelectorAll(".notion-select").forEach(el=>{
    if(el.id!==exceptId) el.classList.remove("open");
  });
}
function toggleNotionSelect(id){
  const wrap=document.getElementById(id);
  const willOpen=!wrap.classList.contains("open");
  closeNotionSelects();
  wrap.classList.toggle("open", willOpen);
}
function filterNotionOptions(id, query){
  const q=(query||"").toLowerCase();
  document.querySelectorAll("#"+id+" .notion-option").forEach(btn=>{
    btn.style.display=btn.dataset.label.toLowerCase().includes(q)?"":"none";
  });
}
function renderDurationSelect(){
  const wrap=document.getElementById("durationSelect");
  if(!wrap) return;
  const selected=sleepDurationBands[sleepDurationBand];
  const trigger=selected?notionPill(selected.label, selected.pill):`<span class="notion-trigger-label">Select an option</span>`;
  const options=Object.entries(sleepDurationBands).map(([id,opt])=>`
    <button type="button" class="notion-option" data-label="${opt.label}" onclick="chooseSleepDuration('${id}')">${notionPill(opt.label,opt.pill)}</button>
  `).join("");
  wrap.innerHTML=`
    <button type="button" class="notion-trigger" onclick="toggleNotionSelect('durationSelect')">
      ${trigger}<span class="notion-chevron">▾</span>
    </button>
    <div class="notion-menu">${options}</div>`;
}
function renderQualitySelect(){
  const wrap=document.getElementById("qualitySelect");
  if(!wrap) return;
  const selected=sleepQualityValue?qualityNames[sleepQualityValue]:"";
  const trigger=selected?notionPill(selected, qualityPills[sleepQualityValue]):`<span class="notion-trigger-label">Select an option</span>`;
  const order=[5,4,3,2,1];
  const options=order.map(id=>`
    <button type="button" class="notion-option" data-label="${qualityNames[id]}" onclick="chooseSleepQuality('${id}')">${notionPill(qualityNames[id],qualityPills[id])}</button>
  `).join("");
  wrap.innerHTML=`
    <button type="button" class="notion-trigger" onclick="toggleNotionSelect('qualitySelect')">
      ${trigger}<span class="notion-chevron">▾</span>
    </button>
    <div class="notion-menu">${options}</div>`;
}
function chooseSleepDuration(band){
  sleepDurationBand=band;
  closeNotionSelects();
  renderDurationSelect();
}
function chooseSleepQuality(value){
  sleepQualityValue=String(value);
  closeNotionSelects();
  renderQualitySelect();
}
async function loadSelectedDate(){
  const data=await getEntries("Sleep",selectedDate,selectedDate); const entry=data[selectedDate];
  document.getElementById("selectedDateTitle").textContent="Today's Sleep";
  sleepDurationBand=entry?.durationBand || bandFromHours(entry?.hours) || "";
  sleepQualityValue=entry?.quality?String(entry.quality):"";
  renderDurationSelect();
  renderQualitySelect();
}
async function saveEntry(){
  if(!sleepDurationBand||!sleepQualityValue){alert("Please select sleep duration and sleep quality.");return;}
  const band=sleepDurationBands[sleepDurationBand];
  if(await saveSystemEntry("Sleep",selectedDate,{hours:band.hours,durationBand:sleepDurationBand,quality:parseInt(sleepQualityValue)})){
    await loadSelectedDate();
    await renderDateStrip(currentDateStripId());
    alert("Sleep data saved to the cloud.");
  }
}

async function loadWorkoutDate(){
  const data=await getEntries("Workout",selectedDate,selectedDate);
  workoutState=data[selectedDate]||{gym:"",gymTime:"",cardio:"",cardioTime:null}; updateWorkoutButtons();
}
async function loadMeditationDate(){
  const data=await getEntries("Meditation",selectedDate,selectedDate);
  meditationState=data[selectedDate]||{morning:"",morningTime:null,night:"",nightTime:null}; updateMeditationButtons();
}
function setActive(id,active,noChoice=false){
  const el=document.getElementById(id);
  if(!el)return;
  el.classList.toggle("active",!!active);
  el.classList.toggle("no-choice",!!active&&noChoice);
}
function setWorkoutChoice(field,value){
  workoutState[field]=value;
  if(field==="gym"&&value==="no") workoutState.gymTime="";
  if(field==="cardio"&&value==="no") workoutState.cardioTime=null;
  updateWorkoutButtons();
}
function setMeditationChoice(field,value){
  meditationState[field]=value;
  if(field==="morning"&&value==="no") meditationState.morningTime=null;
  if(field==="night"&&value==="no") meditationState.nightTime=null;
  updateMeditationButtons();
}
function updateWorkoutButtons(){
  const gymYes=workoutState.gym==="yes", gymNo=workoutState.gym==="no";
  setActive("gymYes",gymYes); setActive("gymNo",gymNo,true);
  ["gymMorning","gymNight"].forEach(id=>{
    const el=document.getElementById(id); if(el) el.disabled=!gymYes;
  });
  setActive("gymMorning",workoutState.gymTime==="morning");
  setActive("gymNight",workoutState.gymTime==="night");

  const cardioYes=workoutState.cardio==="yes", cardioNo=workoutState.cardio==="no";
  setActive("cardioYes",cardioYes); setActive("cardioNo",cardioNo,true);
  [15,30,45,60].forEach(v=>{
    const el=document.getElementById("cardio"+v); if(el) el.disabled=!cardioYes;
    setActive("cardio"+v,workoutState.cardioTime===v);
  });
}
function updateMeditationButtons(){
  const morningYes=meditationState.morning==="yes", morningNo=meditationState.morning==="no";
  setActive("morningYes",morningYes); setActive("morningNo",morningNo,true);
  [5,10,15,20].forEach(v=>{
    const el=document.getElementById("morning"+v); if(el) el.disabled=!morningYes;
    setActive("morning"+v,meditationState.morningTime===v);
  });

  const nightYes=meditationState.night==="yes", nightNo=meditationState.night==="no";
  setActive("nightYes",nightYes); setActive("nightNo",nightNo,true);
  [5,10,15,20].forEach(v=>{
    const el=document.getElementById("night"+v); if(el) el.disabled=!nightYes;
    setActive("night"+v,meditationState.nightTime===v);
  });
}
async function saveWorkout(){
  if(!workoutState.gym||!workoutState.cardio){alert("Please select Yes or No for both Gym and Cardio.");return;}
  if(workoutState.gym==="yes"&&!workoutState.gymTime){alert("Please select Morning or Night for Gym.");return;}
  if(workoutState.cardio==="yes"&&!workoutState.cardioTime){alert("Please select a Cardio time.");return;}
  if(await saveSystemEntry("Workout",selectedDate,workoutState)){
    await renderDateStrip(currentDateStripId());
    alert("Workout data saved to the cloud.");
  }
}
async function saveMeditation(){
  if(!meditationState.morning||!meditationState.night){alert("Please select Yes or No for both Morning and Night.");return;}
  if(meditationState.morning==="yes"&&!meditationState.morningTime){alert("Please select a Morning meditation time.");return;}
  if(meditationState.night==="yes"&&!meditationState.nightTime){alert("Please select a Night meditation time.");return;}
  if(await saveSystemEntry("Meditation",selectedDate,meditationState)){
    await renderDateStrip(currentDateStripId());
    alert("Meditation data saved to the cloud.");
  }
}

async function loadSimpleTrackerDate(systemName){
  const data=await getEntries(systemName,selectedDate,selectedDate);
  simpleTrackerState={system:systemName,value:data[selectedDate]?.value||""};
  updateSimpleTrackerButtons();
}
function setSimpleTrackerChoice(value){
  simpleTrackerState.value=value;
  updateSimpleTrackerButtons();
}
function updateSimpleTrackerButtons(){
  setActive("simpleYes",simpleTrackerState.value==="yes");
  setActive("simpleNo",simpleTrackerState.value==="no",true);
}
async function saveSimpleTracker(){
  if(!simpleTrackerState.value){alert("Please select Yes or No.");return;}
  if(await saveSystemEntry(simpleTrackerState.system,selectedDate,{value:simpleTrackerState.value})){
    await renderDateStrip(currentDateStripId());
    alert(simpleTrackerState.system+" data saved to the cloud.");
  }
}

const DEFINITION_DATE="1970-01-01";
let definitionSystem="";
async function openSystemDefinition(name){
  definitionSystem=name||currentEntrySystem();
  if(!definitionSystem) return;
  workspaceMode="system";
  currentPage="definition";
  hideWorkspacePages();
  document.getElementById("workspaceTitle").textContent=definitionSystem;
  document.getElementById("workspaceSub").textContent="";
  document.getElementById("systemDefinitionTitle").textContent=definitionSystem+" Definition";
  document.getElementById("systemDefinitionPage").style.display="block";
  const rows=await getEntries(definitionSystem,DEFINITION_DATE,DEFINITION_DATE);
  const saved=rows[DEFINITION_DATE];
  const text=saved?.text||(Array.isArray(saved?.bullets)?saved.bullets.join("\n"):"");
  document.getElementById("systemDefinitionText").value=text;
  const btn=document.getElementById("saveDefinitionBtn");
  if(btn) btn.classList.remove("saved");
}
async function saveSystemDefinition(){
  if(!definitionSystem) return;
  const domainEditor=document.getElementById("domainDefinitionEditor");
  const useDomainEditor=domainEditor && domainEditor.style.display!=="none" && currentLayer===3;
  const text=document.getElementById(useDomainEditor?"domainDefinitionText":"systemDefinitionText").value;
  const bullets=text.split(/\n/).map(line=>line.replace(/^\s*[•\-\*]\s*/,"").trim()).filter(Boolean);
  if(await saveSystemEntry(definitionSystem,DEFINITION_DATE,{text,bullets})){
    const btn=document.getElementById(useDomainEditor?"saveDomainDefinitionBtn":"saveDefinitionBtn");
    if(btn) btn.classList.add("saved");
  }
}
async function showPage(page){
  if(osMode)return; currentPage=page;
  if(page!=="entry"){
    workspaceMode="system";
    if(currentItem===0) currentItem=1;
  }
  document.getElementById("dashboardTab").classList.toggle("active",page==="dashboard");
  document.getElementById("analyticsTab").classList.toggle("active",page==="analytics");
  renderSidebar();
  await renderWorkspace();
  syncMobileUI();
  if(isMobileUI()) await setMobileTab(mobileTab);
}
function hubChoice(label, active, extraClass, onclick, disabled=false){
  return `<button type="button" class="choice mini${extraClass?(" "+extraClass):""}${active?" active":""}" ${disabled?"disabled":`onclick="${onclick}"`}>${label}</button>`;
}
function isHubSystemComplete(name, entry){
  if(!entry) return false;
  if(name==="Sleep") return !!(entry.quality && (entry.durationBand||entry.hours));
  if(name==="Workout") return !!(coerceHubValue(entry.gym) && coerceHubValue(entry.cardio));
  if(name==="Meditation") return !!(coerceHubValue(entry.morning) && coerceHubValue(entry.night));
  if(name==="Reading") return !!coerceHubValue(entry.value);
  if(name==="NoPMO"){
    const value=coerceHubValue(entry.value);
    return !!(value && (value!=="no" || entry.tier));
  }
  return !!coerceHubValue(entry.value);
}
function isOutcomesComplete(row){
  const scores=outcomeScoresFromRow(row);
  return currentOutcomeGroups().flatMap(group=>group.items).every(name=>scores[name]!=null && scores[name]!=="");
}
function isLoadedEntryDayComplete(){
  if(currentLayer===2) return isOutcomesComplete({scores:entryOutcomes});
  const names=personalGroups[0].blocks.flat();
  return names.every(name=>isHubSystemComplete(name, entryHub[name])) && isOutcomesComplete({scores:entryOutcomes});
}
function isCurrentHubComplete(name){
  return isHubSystemComplete(name, entryHub[name]);
}
function rowTick(on){
  return `<span class="row-tick${on?" on":""}"></span>`;
}
function hubLabel(name){
  return `<div class="hub-name">${rowTick(isCurrentHubComplete(name))}${sidebarIcon(name)} ${name}</div>`;
}
function normalizeOutcomeScore(raw){
  const n=Number(raw);
  if(Number.isNaN(n)||n<=0) return "";
  if(n<=5) return String(n);
  if(n<=2) return "1";
  if(n<=4) return "2";
  if(n<=6) return "3";
  if(n<=8) return "4";
  return "5";
}
function setProductivityEntryView(view){
  productivityEntryView=view;
  renderEntryHub();
}
function renderEntryHub(){
  const body=document.getElementById("entryHubBody");
  if(!body) return;
  const title=document.getElementById("systemEntryTitle");
  if(currentLayer===2){
    if(title) title.innerHTML=`<div class="prod-scope-toggle">
      <button class="focus-btn${productivityEntryView==="daily"?" active":""}" onclick="setProductivityEntryView('daily')">Daily</button>
      <button class="focus-btn${productivityEntryView==="weekly"?" active":""}" onclick="setProductivityEntryView('weekly')">Weekly</button>
      <button class="focus-btn${productivityEntryView==="monthly"?" active":""}" onclick="setProductivityEntryView('monthly')">Monthly</button>
    </div>`;
    const label=productivityEntryView[0].toUpperCase()+productivityEntryView.slice(1);
    body.innerHTML=`<div class="prod-entry-empty">${label} system fields will go here.</div>`;
    return;
  }
  if(title) title.textContent="System Entry";
  const yn=(sys,field,includeOff)=>{
    const val=field?entryHub[sys][field]:entryHub[sys].value;
    const set=field?`setHubField('${sys}','${field}'`:`setHubValue('${sys}'`;
    return `${hubChoice("Yes",val==="yes","",set+",'yes')")}
      ${hubChoice("No",val==="no","no-choice",set+",'no')")}
      ${includeOff?hubChoice("Off",val==="off","off-choice",set+",'off')"):""}`;
  };
  const sleepQuality=entryHub.Sleep.quality;
  const sleepBand=entryHub.Sleep.durationBand;
  const wakeOpts=sleepWakeTimes.map(t=>`<button type="button" class="notion-option" data-label="${t}" onclick="chooseHubSleepWake('${t}')">${notionPill(t,"pill-okay")}</button>`).join("");
  const qualityOpts=[5,4,3,2,1].map(id=>`<button type="button" class="notion-option" data-label="${qualityNames[id]}" onclick="chooseHubSleepQuality('${id}')">${notionPill(qualityNames[id],qualityPills[id])}</button>`).join("");
  const hourOpts=Object.entries(sleepDurationBands).map(([id,opt])=>`<button type="button" class="notion-option" data-label="${opt.label}" onclick="chooseHubSleepBand('${id}')">${notionPill(opt.label,opt.pill)}</button>`).join("");
  const sleepWake=entryHub.Sleep.wakeTime;
  body.innerHTML=`
    <div class="hub-block">
      <div class="hub-row">${hubLabel("Morning")}<div class="hub-controls">${yn("Morning","",true)}</div></div>
      <div class="hub-row">${hubLabel("Night")}<div class="hub-controls">${yn("Night","",true)}</div></div>
    </div>
    <div class="divider"></div>
    <div class="hub-block">
      <div class="hub-row">
        ${hubLabel("Sleep")}
        <div class="hub-controls hub-sleep-controls">
          <div class="notion-select hub-select wake-select" id="hubWakeSelect">
            <button type="button" class="notion-trigger" onclick="toggleNotionSelect('hubWakeSelect')">${sleepWake?notionPill(sleepWake,"pill-okay"):'<span class="notion-trigger-label">Wake up time</span>'}<span class="notion-chevron">▾</span></button>
            <div class="notion-menu">${wakeOpts}</div>
          </div>
          <div class="notion-select hub-select" id="hubQualitySelect">
            <button type="button" class="notion-trigger" onclick="toggleNotionSelect('hubQualitySelect')">${sleepQuality?notionPill(qualityNames[sleepQuality],qualityPills[sleepQuality]):'<span class="notion-trigger-label">Quality</span>'}<span class="notion-chevron">▾</span></button>
            <div class="notion-menu">${qualityOpts}</div>
          </div>
          <div class="notion-select hub-select" id="hubHoursSelect">
            <button type="button" class="notion-trigger" onclick="toggleNotionSelect('hubHoursSelect')">${sleepBand?notionPill(sleepDurationBands[sleepBand].label,sleepDurationBands[sleepBand].pill):'<span class="notion-trigger-label">Hours</span>'}<span class="notion-chevron">▾</span></button>
            <div class="notion-menu">${hourOpts}</div>
          </div>
        </div>
      </div>
      <div class="hub-row">${hubLabel("Workout")}<div class="hub-controls"><span class="hub-label">Gym</span>${yn("Workout","gym",true)}<span class="hub-label">Cardio</span>${yn("Workout","cardio",true)}</div></div>
      <div class="hub-row">${hubLabel("Meditation")}<div class="hub-controls"><span class="hub-label">Morning</span>${yn("Meditation","morning",false)}<span class="hub-label">Night</span>${yn("Meditation","night",false)}</div></div>
      <div class="hub-row">${hubLabel("Diet")}<div class="hub-controls">${yn("Diet","",true)}</div></div>
      <div class="hub-row">${hubLabel("NoPMO")}<div class="hub-controls">${yn("NoPMO","",false)}<span class="hub-extra">${hubChoice("Beta",entryHub.NoPMO.tier==="beta","tiny nopmo-beta",`setHubNoPMOTier('beta')`,entryHub.NoPMO.value!=="no")}${hubChoice("Alpha",entryHub.NoPMO.tier==="alpha","tiny nopmo-alpha",`setHubNoPMOTier('alpha')`,entryHub.NoPMO.value!=="no")}</span></div></div>
    </div>
    <div class="divider"></div>
    <div class="hub-block">
      <div class="hub-row">${hubLabel("Scrolling")}<div class="hub-controls">${yn("Scrolling","",true)}</div></div>
      <div class="hub-row">${hubLabel("Journaling")}<div class="hub-controls">${yn("Journaling","",true)}</div></div>
      <div class="hub-row">${hubLabel("Reading")}<div class="hub-controls">${yn("Reading","",true)}</div></div>
      <div class="hub-row">${hubLabel("Calisthenics")}<div class="hub-controls">${yn("Calisthenics","",true)}</div></div>
    </div>`;
}
function setEntrySavedState(saved){
  const btn=document.getElementById("saveEntryHubBtn");
  if(btn) btn.classList.toggle("saved",!!saved);
}
function setHubValue(sys,value){
  entryHub[sys].value=value;
  if(sys==="Reading" && value!=="yes") entryHub.Reading.duration=null;
  if(sys==="NoPMO" && value!=="no") entryHub.NoPMO.tier="";
  setEntrySavedState(false);
  renderEntryHub();
}
function setHubField(sys,field,value){entryHub[sys][field]=value;setEntrySavedState(false);renderEntryHub();}
function setHubReadingDuration(value){entryHub.Reading.duration=value;setEntrySavedState(false);renderEntryHub();}
function setHubNoPMOTier(tier){entryHub.NoPMO.tier=tier;setEntrySavedState(false);renderEntryHub();}
function chooseHubSleepQuality(value){entryHub.Sleep.quality=String(value);closeNotionSelects();setEntrySavedState(false);renderEntryHub();}
function chooseHubSleepBand(band){entryHub.Sleep.durationBand=band;closeNotionSelects();setEntrySavedState(false);renderEntryHub();}
function chooseHubSleepWake(time){entryHub.Sleep.wakeTime=time;closeNotionSelects();setEntrySavedState(false);renderEntryHub();}
async function loadEntryHub(){
  if(currentLayer===2){
    entryOutcomes=blankOutcomes();
    const outcomeData=(await getEntries(currentOutcomeSystem(),selectedDate,selectedDate))[selectedDate];
    const loadedScores=outcomeScoresFromRow(outcomeData);
    Object.keys(entryOutcomes).forEach(key=>{
      if(loadedScores[key]!=null && loadedScores[key]!=="") entryOutcomes[key]=normalizeOutcomeScore(loadedScores[key]);
    });
    renderEntryHub();
    renderOutcomeHub();
    setEntrySavedState(false);
    syncSelectedDateTick();
    return;
  }
  entryHub=blankEntryHub();
  const [morning,night,sleep,workout,meditation,diet,scrolling,journaling,reading,calisthenics,nofap]=await Promise.all([
    getEntries("Morning",selectedDate,selectedDate),
    getEntries("Night",selectedDate,selectedDate),
    getEntries("Sleep",selectedDate,selectedDate),
    getEntries("Workout",selectedDate,selectedDate),
    getEntries("Meditation",selectedDate,selectedDate),
    getEntries("Diet",selectedDate,selectedDate),
    getEntries("Scrolling",selectedDate,selectedDate),
    getEntries("Journaling",selectedDate,selectedDate),
    getEntries("Reading",selectedDate,selectedDate),
    getEntries("Calisthenics",selectedDate,selectedDate),
    getEntries("NoPMO",selectedDate,selectedDate)
  ]);
  if(morning[selectedDate]?.value!=null && morning[selectedDate].value!=="") entryHub.Morning.value=coerceHubValue(morning[selectedDate].value);
  if(night[selectedDate]?.value!=null && night[selectedDate].value!=="") entryHub.Night.value=coerceHubValue(night[selectedDate].value);
  if(sleep[selectedDate]){
    entryHub.Sleep.durationBand=sleep[selectedDate].durationBand||bandFromHours(sleep[selectedDate].hours)||"";
    entryHub.Sleep.quality=sleep[selectedDate].quality?String(sleep[selectedDate].quality):"";
    entryHub.Sleep.wakeTime=sleep[selectedDate].wakeTime||"";
  }
  if(workout[selectedDate]){
    entryHub.Workout.gym=coerceHubValue(workout[selectedDate].gym);
    entryHub.Workout.cardio=coerceHubValue(workout[selectedDate].cardio);
  }
  if(meditation[selectedDate]){
    entryHub.Meditation.morning=coerceHubValue(meditation[selectedDate].morning);
    entryHub.Meditation.night=coerceHubValue(meditation[selectedDate].night);
  }
  if(diet[selectedDate]?.value!=null && diet[selectedDate].value!=="") entryHub.Diet.value=coerceHubValue(diet[selectedDate].value);
  if(scrolling[selectedDate]?.value!=null && scrolling[selectedDate].value!=="") entryHub.Scrolling.value=coerceHubValue(scrolling[selectedDate].value);
  if(journaling[selectedDate]?.value!=null && journaling[selectedDate].value!=="") entryHub.Journaling.value=coerceHubValue(journaling[selectedDate].value);
  if(reading[selectedDate]){
    entryHub.Reading.value=coerceHubValue(reading[selectedDate].value);
    entryHub.Reading.duration=reading[selectedDate].duration||null;
  }
  if(calisthenics[selectedDate]?.value!=null && calisthenics[selectedDate].value!=="") entryHub.Calisthenics.value=coerceHubValue(calisthenics[selectedDate].value);
  if(nofap[selectedDate]){
    entryHub.NoPMO.value=coerceHubValue(nofap[selectedDate].value);
    entryHub.NoPMO.tier=nofap[selectedDate].tier||"";
  }
  const outcomeData=(await getEntries(currentOutcomeSystem(),selectedDate,selectedDate))[selectedDate];
  entryOutcomes=blankOutcomes();
  const loadedScores=outcomeScoresFromRow(outcomeData);
  Object.keys(entryOutcomes).forEach(key=>{
    if(loadedScores[key]!=null && loadedScores[key]!=="") entryOutcomes[key]=normalizeOutcomeScore(loadedScores[key]);
  });
  renderEntryHub();
  renderOutcomeHub();
  setEntrySavedState(false);
  syncSelectedDateTick();
}
function renderOutcomeHub(){
  const body=document.getElementById("outcomeHubBody");
  if(!body) return;
  const levels=[["1","lvl-red"],["2","lvl-orange"],["3","lvl-blue"],["4","lvl-green"],["5","lvl-lime"]];
  body.innerHTML=currentOutcomeGroups().map(group=>`
    <div class="outcome-group ${group.tone}">
      ${group.items.map(name=>`
        <div class="outcome-row">
          ${rowTick(!!entryOutcomes[name])}
          <div class="outcome-name">${name}</div>
          <div class="score-row">${levels.map(([v,cls])=>`<button type="button" class="score-swatch ${cls}${String(entryOutcomes[name])===v?" active":""}" onclick="setOutcomeScore('${name}',${v})"></button>`).join("")}</div>
        </div>
      `).join("")}
    </div>
  `).join("");
}
function setOutcomeScore(name, value){
  entryOutcomes[name]=String(entryOutcomes[name])===String(value)?"":String(value);
  setEntrySavedState(false);
  renderOutcomeHub();
}
async function saveEntryHub(){
  const writes=[];
  if(currentLayer===2){
    const outcomeScores={};
    let hasOutcomes=false;
    Object.keys(entryOutcomes).forEach(key=>{
      if(entryOutcomes[key]!==""){outcomeScores[key]=Number(entryOutcomes[key]);hasOutcomes=true;}
    });
    if(!hasOutcomes){alert("Select at least one outcome before saving.");return;}
    writes.push(saveSystemEntry(currentOutcomeSystem(),selectedDate,{scores:outcomeScores,scope:productivityEntryView}));
    await Promise.all(writes);
    await renderDateStrip("entryHubDateStrip");
    setEntrySavedState(true);
    return;
  }
  if(entryHub.Morning.value) writes.push(saveSystemEntry("Morning",selectedDate,{value:entryHub.Morning.value}));
  if(entryHub.Night.value) writes.push(saveSystemEntry("Night",selectedDate,{value:entryHub.Night.value}));
  if(entryHub.Sleep.durationBand && entryHub.Sleep.quality){
    const band=sleepDurationBands[entryHub.Sleep.durationBand];
    writes.push(saveSystemEntry("Sleep",selectedDate,{hours:band.hours,durationBand:entryHub.Sleep.durationBand,quality:parseInt(entryHub.Sleep.quality),wakeTime:entryHub.Sleep.wakeTime||""}));
  }
  if(entryHub.Workout.gym && entryHub.Workout.cardio){
    const existing=(await getEntries("Workout",selectedDate,selectedDate))[selectedDate]||{};
    writes.push(saveSystemEntry("Workout",selectedDate,{
      gym:entryHub.Workout.gym,
      gymTime:entryHub.Workout.gym==="yes"?existing.gymTime||"":"",
      cardio:entryHub.Workout.cardio,
      cardioTime:entryHub.Workout.cardio==="yes"?existing.cardioTime||null:null
    }));
  }
  if(entryHub.Meditation.morning && entryHub.Meditation.night){
    const existing=(await getEntries("Meditation",selectedDate,selectedDate))[selectedDate]||{};
    writes.push(saveSystemEntry("Meditation",selectedDate,{
      morning:entryHub.Meditation.morning,
      morningTime:entryHub.Meditation.morning==="yes"?existing.morningTime||null:null,
      night:entryHub.Meditation.night,
      nightTime:entryHub.Meditation.night==="yes"?existing.nightTime||null:null
    }));
  }
  ["Diet","Scrolling","Journaling","Calisthenics"].forEach(name=>{
    if(entryHub[name].value) writes.push(saveSystemEntry(name,selectedDate,{value:entryHub[name].value}));
  });
  if(entryHub.Reading.value){
    writes.push(saveSystemEntry("Reading",selectedDate,{value:entryHub.Reading.value}));
  }
  if(entryHub.NoPMO.value){
    if(entryHub.NoPMO.value==="no" && !entryHub.NoPMO.tier){alert("Please select Beta or Alpha for NoPMO.");return;}
    writes.push(saveSystemEntry("NoPMO",selectedDate,{value:entryHub.NoPMO.value,tier:entryHub.NoPMO.value==="no"?entryHub.NoPMO.tier:""}));
  }
  const outcomeScores={};
  let hasOutcomes=false;
  Object.keys(entryOutcomes).forEach(key=>{
    if(entryOutcomes[key]!==""){outcomeScores[key]=Number(entryOutcomes[key]);hasOutcomes=true;}
  });
  if(hasOutcomes) writes.push(saveSystemEntry("Outcomes",selectedDate,{scores:outcomeScores}));
  if(!writes.length){alert("Select at least one system or outcome before saving.");return;}
  await Promise.all(writes);
  await renderDateStrip("entryHubDateStrip");
  setEntrySavedState(true);
}
function startOfWeekMonday(date){
  const d=new Date(date.getFullYear(),date.getMonth(),date.getDate());
  const day=d.getDay();
  d.setDate(d.getDate()+(day===0?-6:1-day));
  return d;
}
function dateToneClass(date, today){
  const a=getDateString(date), b=getDateString(today);
  if(a===b) return " today-date";
  return a<b?" past":" future";
}
function currentEntrySystem(){
  if(currentItem>=1) return personalSystemName(currentItem);
  return null;
}
function currentDateStripId(){
  if(workspaceMode==="entry") return "entryHubDateStrip";
  const name=currentEntrySystem();
  if(name==="Workout") return "workoutDateStrip";
  if(name==="Meditation") return "meditationDateStrip";
  if(name==="Sleep") return "dateStrip";
  return "simpleDateStrip";
}
async function onPickEntryDate(dateString, targetId){
  selectedDate=dateString;
  await renderDateStrip(targetId);
  document.getElementById("currentDateLabel").innerHTML=formatDate(selectedDate);
  if(workspaceMode==="entry"){await loadEntryHub();return;}
  await loadSelectedDate();
  await loadWorkoutDate();
  await loadMeditationDate();
  const name=currentEntrySystem();
  if(name && !["Sleep","Workout","Meditation"].includes(name)) await loadSimpleTrackerDate(name);
}
async function setEntryDateView(view){
  entryDateView=view;
  await renderDateStrip(currentDateStripId());
}
function syncSelectedDateTick(){
  const root=document.getElementById(currentDateStripId());
  if(!root) return;
  root.querySelectorAll(".date").forEach(el=>{
    const check=el.querySelector(".date-check");
    if(!check) return;
    const number=el.querySelector(".number");
    if(!number) return;
    const selected=el.classList.contains("selected");
    if(!selected) return;
    check.classList.toggle("on", isLoadedEntryDayComplete());
  });
}
async function renderDateStrip(targetId="dateStrip"){
  const container=document.getElementById(targetId);
  if(!container) return;
  container.className="entry-dates";
  const today=new Date();
  const anchor=new Date(selectedDate+"T00:00:00");
  const dates=[];
  if(entryDateView==="month"){
    const first=new Date(anchor.getFullYear(),anchor.getMonth(),1);
    const gridStart=startOfWeekMonday(first);
    for(let i=0;i<42;i++){
      const date=new Date(gridStart);
      date.setDate(gridStart.getDate()+i);
      dates.push(date);
    }
    while(dates.length>28){
      const lastWeek=dates.slice(-7);
      if(lastWeek.every(d=>d.getMonth()!==anchor.getMonth())) dates.splice(-7);
      else break;
    }
  }else{
    const monday=startOfWeekMonday(anchor);
    for(let i=0;i<7;i++){
      const date=new Date(monday);
      date.setDate(monday.getDate()+i);
      dates.push(date);
    }
  }

  const logged={};
  if(dates.length){
    const start=getDateString(dates[0]), end=getDateString(dates[dates.length-1]);
    if(workspaceMode==="entry"){
      if(currentLayer===2){
        const rows=await getEntries(currentOutcomeSystem(),start,end);
        const names=currentOutcomeGroups().flatMap(group=>group.items);
        dates.forEach(date=>{
          const key=getDateString(date);
          logged[key]=isOutcomesComplete(rows[key]);
        });
      }else{
        const names=personalGroups[0].blocks.flat();
        const packs=await Promise.all(names.map(name=>getEntries(name,start,end)));
        const outcomeRows=await getEntries(currentOutcomeSystem(),start,end);
        const outcomeNames=currentOutcomeGroups().flatMap(group=>group.items);
        dates.forEach(date=>{
          const key=getDateString(date);
          const systemsDone=names.every((name,i)=>isHubSystemComplete(name,(packs[i]||{})[key]));
          logged[key]=systemsDone && isOutcomesComplete(outcomeRows[key]);
        });
      }
    }else{
      const systemName=currentEntrySystem();
      if(systemName){
        const rows=await getEntries(systemName,start,end);
        Object.keys(rows||{}).forEach(key=>logged[key]=true);
      }
    }
  }

  const grid=document.createElement("div");
  grid.className="date-grid";
  dates.forEach(date=>{
    const dateString=getDateString(date);
    const inMonth=date.getMonth()===anchor.getMonth();
    const outside=entryDateView==="month"&&!inMonth;
    const button=document.createElement("div");
    button.className="date"+dateToneClass(date,today)+(dateString===selectedDate?" selected":"")+(outside?" outside":"");
    const weekday=date.toLocaleDateString(undefined,{weekday:"long"});
    button.innerHTML=`<span class="date-check${logged[dateString]?" on":""}"></span><div class="day">${weekday}</div><div class="number">${date.getDate()}</div>${getDateString(date)===getDateString(today)?'<div class="today-label">Today</div>':''}`;
    if(!outside) button.onclick=()=>onPickEntryDate(dateString,targetId);
    grid.appendChild(button);
  });

  const toggle=document.createElement("div");
  toggle.className="date-view-toggle";
  toggle.innerHTML=`
    <button class="range-btn${entryDateView==="week"?" active":""}" onclick="setEntryDateView('week')">Week</button>
    <button class="range-btn${entryDateView==="month"?" active":""}" onclick="setEntryDateView('month')">Month</button>`;

  container.innerHTML="";
  container.appendChild(grid);
  container.appendChild(toggle);
  document.getElementById("currentDateLabel").innerHTML=formatDate(selectedDate);
}
function getLastSevenDays(){
  return getDateRange(7);
}
function updateDashRangeButtons(){
  document.querySelectorAll(".sleep-range-7, .dash-range-7").forEach(btn=>btn.classList.toggle("active", dashRangeDays===7));
  document.querySelectorAll(".sleep-range-30, .dash-range-30").forEach(btn=>btn.classList.toggle("active", dashRangeDays===30));
}
async function setSleepDashRange(days){return setDashRange(days);}
async function setDashRange(days){
  dashRangeDays=days;
  updateDashRangeButtons();
  if(workspaceMode==="outcomes"){await renderOutcomeDashboard();return;}
  const name=currentEntrySystem();
  if(name==="Sleep") await renderDashboard();
  else if(name) await renderEngineDashboard(name);
}
async function renderDashboard(){
  const days=dashRangeDays;
  const dates=getDateRange(days);
  const data=await getEntries("Sleep",dates[0],dates[dates.length-1]);
  const entries=dates.map(date=>data[date]).filter(Boolean);
  const rangeText=days+" DAYS";
  document.getElementById("avgHoursLabel").textContent="AVG SLEEP · "+rangeText;
  document.getElementById("avgQualityLabel").textContent="AVG QUALITY · "+rangeText;
  document.getElementById("daysLoggedSmall").textContent="of "+days;
  document.getElementById("consistencySmall").textContent=days===30?"last 30 days":"last 7 days";
  document.getElementById("analyticsAvgHoursLabel").textContent="AVG SLEEP · "+rangeText;
  document.getElementById("analyticsAvgQualityLabel").textContent="AVG QUALITY · "+rangeText;
  document.getElementById("analyticsDaysLoggedSmall").textContent="of "+days;
  document.getElementById("analyticsConsistencySmall").textContent=days===30?"last 30 days":"last 7 days";
  if(entries.length){
    const avgHours=entries.reduce((s,e)=>s+Number(e.hours),0)/entries.length;
    const avgQuality=entries.reduce((s,e)=>s+Number(e.quality),0)/entries.length;
    document.getElementById("avgHours").textContent=avgHours.toFixed(1);
    document.getElementById("avgQuality").textContent=avgQuality.toFixed(1);
    document.getElementById("daysLogged").textContent=entries.length;
    document.getElementById("consistency").textContent=Math.round(entries.length/days*100)+"%";
  }else{
    document.getElementById("avgHours").textContent="—";
    document.getElementById("avgQuality").textContent="—";
    document.getElementById("daysLogged").textContent="0";
    document.getElementById("consistency").textContent="0%";
  }
  renderChart("hoursChart",data,dates,"hours");
  renderChart("qualityChart",data,dates,"quality");
  renderChart("wakeChart",data,dates,"wake");
  document.getElementById("analyticsAvgHours").textContent=document.getElementById("avgHours").textContent;
  document.getElementById("analyticsAvgQuality").textContent=document.getElementById("avgQuality").textContent;
  document.getElementById("analyticsDaysLogged").textContent=document.getElementById("daysLogged").textContent;
  document.getElementById("analyticsConsistency").textContent=document.getElementById("consistency").textContent;
  renderChart("analyticsHoursChart",data,dates,"hours");
  renderChart("analyticsQualityChart",data,dates,"quality");
  updateDashRangeButtons();
}
function renderChart(id,data,dates,type){
  const chart=document.getElementById(id);
  if(!chart) return;
  chart.innerHTML="";
  chart.classList.toggle("dense", dates.length>10);
  const max=type==="hours"?Math.max(10,...dates.map(d=>data[d]?Number(data[d].hours):0)):type==="wake"?100:5;
  dates.forEach(date=>{
    const entry=data[date];
    const container=document.createElement("div");
    container.className="bar-container";
    if(entry){
      const value=document.createElement("div");
      value.className="bar-value";
      const bandKey=resolveSleepBand(entry);
      const band=sleepDurationBands[bandKey];
      const wakeScore=sleepWakeScore(entry.wakeTime);
      const qualityScore=entry.quality?(Number(entry.quality)/5)*100:0;
      value.textContent=type==="hours"?(band?band.short:entry.hours+"h"):type==="wake"?(entry.wakeTime||"—"):qualityNames[entry.quality];
      const bar=document.createElement("div");
      bar.className="bar "+(type==="hours"?(band?band.bar:"critical"):healthBand(type==="wake"?wakeScore:qualityScore));
      const v=type==="hours"?Number(entry.hours):type==="wake"?wakeScore:Number(entry.quality);
      bar.style.height=`${Math.max(8,(v/max)*100)}%`;
      container.appendChild(value);
      container.appendChild(bar);
    }else{
      const empty=document.createElement("div");
      empty.style.height="3px";
      empty.style.width="55%";
      empty.style.background="#30353e";
      empty.style.borderRadius="5px 5px 0 0";
      container.appendChild(empty);
    }
    const label=document.createElement("div");
    label.className="bar-label";
    const dt=new Date(date+"T00:00:00");
    label.textContent=dates.length>10?String(dt.getDate()):dt.toLocaleDateString(undefined,{weekday:"short"});
    container.appendChild(label);
    chart.appendChild(container);
  });
}

function getDateRange(days){
  const dates=[], today=new Date();
  for(let i=days-1;i>=0;i--){
    const date=new Date(today);
    date.setDate(today.getDate()-i);
    dates.push(getDateString(date));
  }
  return dates;
}
function shortWeekday(dateString){
  return new Date(dateString+"T00:00:00").toLocaleDateString(undefined,{weekday:"short"});
}
function avgOrDash(values, digits=1){
  if(!values.length) return "—";
  return (values.reduce((s,v)=>s+Number(v),0)/values.length).toFixed(digits);
}
function currentStreak(dates, isSuccess){
  let streak=0;
  for(let i=dates.length-1;i>=0;i--){
    if(isSuccess(dates[i])) streak++;
    else break;
  }
  return streak;
}
function renderEngineMetrics(metrics){
  document.getElementById("engineDashMetrics").innerHTML=metrics.map(m=>`
    <div class="metric">
      <div class="metric-label">${m.label}</div>
      <div class="metric-value">${m.value}</div>
      <div class="metric-small">${m.small||""}</div>
    </div>`).join("");
}
function renderBarChart(containerId, dates, getBar){
  const chart=document.createElement("div");
  chart.className="chart"+(dates.length>10?" dense":"");
  chart.id=containerId;
  dates.forEach(date=>{
    const spec=getBar(date);
    const wrap=document.createElement("div");
    wrap.className="bar-container";
    if(spec.valueText){
      const value=document.createElement("div");
      value.className="bar-value";
      value.textContent=spec.valueText;
      wrap.appendChild(value);
    }
    const bar=document.createElement("div");
    bar.className="bar "+(spec.barClass||"");
    bar.style.height=spec.height||"3px";
    wrap.appendChild(bar);
    const label=document.createElement("div");
    label.className="bar-label";
    const dt=new Date(date+"T00:00:00");
    label.textContent=dates.length>10?String(dt.getDate()):shortWeekday(date);
    wrap.appendChild(label);
    chart.appendChild(wrap);
  });
  return chart;
}
function outcomeLevelFromRaw(raw){
  const n=Number(normalizeOutcomeScore(raw));
  return n||null;
}
function outcomeBarSpec(level){
  if(!level) return {height:"3px", barClass:"empty-bar"};
  const heights={1:"10px",2:"18px",3:"28px",4:"38px",5:"48px"};
  return {valueText:String(level), height:heights[level]||"22px", barClass:"out-bar-"+level};
}
function outcomeGroupTitle(group){
  if(group.tone==="good") return currentLayer===2?"High Output":"High State";
  if(group.tone==="bad") return currentLayer===2?"Friction":"Strain";
  return "Focus";
}
async function renderOutcomeDashboard(){
  const defBtn=document.getElementById("engineDefBtn");
  if(defBtn) defBtn.style.display="none";
  const page=document.getElementById("engineDashboardPage");
  if(page) page.classList.add("outcome-mode");
  const systemPage=document.getElementById("systemPage");
  if(systemPage) systemPage.classList.add("outcome-fit");
  const dayCount=dashRangeDays;
  const dates=getDateRange(dayCount);
  const rows=await getEntries(currentOutcomeSystem(),dates[0],dates[dates.length-1]);
  const groups=currentOutcomeGroups();
  const allNames=groups.flatMap(group=>group.items);
  const logged=dates.filter(date=>{
    const scores=outcomeScoresFromRow(rows[date]);
    return allNames.some(name=>scores[name]!=null && scores[name]!=="");
  });
  const complete=dates.filter(date=>isOutcomesComplete(rows[date]));
  const values=[];
  logged.forEach(date=>{
    const scores=outcomeScoresFromRow(rows[date]);
    allNames.forEach(name=>{
      const level=outcomeLevelFromRaw(scores[name]);
      if(level) values.push(level);
    });
  });
  const avg=values.length?(values.reduce((a,b)=>a+b,0)/values.length):null;
  const groupAvg=group=>{
    const vals=[];
    logged.forEach(date=>{
      const scores=outcomeScoresFromRow(rows[date]);
      group.items.forEach(name=>{
        const level=outcomeLevelFromRaw(scores[name]);
        if(level) vals.push(level);
      });
    });
    return vals.length?(vals.reduce((a,b)=>a+b,0)/vals.length):null;
  };
  const high=groups[0]?groupAvg(groups[0]):null;
  const low=groups[1]?groupAvg(groups[1]):null;
  const consistency=Math.round(logged.length/dates.length*100)+"%";
  const rangeLabel=dayCount===30?"Last 30 days":"Last 7 days";
  renderEngineMetrics([
    {label:`AVG SCORE · ${dayCount} DAYS`, value:avg==null?"—":avg.toFixed(1), small:"out of 5"},
    {label:`${(groups[0]?outcomeGroupTitle(groups[0]):"HIGH").toUpperCase()} · ${dayCount} DAYS`, value:high==null?"—":high.toFixed(1), small:"out of 5"},
    {label:`${(groups[1]?outcomeGroupTitle(groups[1]):"LOW").toUpperCase()} · ${dayCount} DAYS`, value:low==null?"—":low.toFixed(1), small:"out of 5"},
    {label:"DAYS LOGGED", value:String(logged.length), small:consistency+" · "+rangeLabel.toLowerCase()}
  ]);
  const charts=document.getElementById("engineDashCharts");
  charts.innerHTML="";
  updateDashRangeButtons();
  if(dayCount!==7) return;
  const goodItems=(groups.find(group=>group.tone==="good")||{items:[]}).items;
  const badItems=(groups.find(group=>group.tone==="bad")||{items:[]}).items;
  const grid=document.createElement("div");
  grid.className="outcome-dash-grid";
  const addOutcomeCard=(name, tone)=>{
    if(!name){
      const spacer=document.createElement("div");
      grid.appendChild(spacer);
      return;
    }
    const levels=dates.map(date=>outcomeLevelFromRaw(outcomeScoresFromRow(rows[date])[name])).filter(Boolean);
    const itemAvg=levels.length?(levels.reduce((a,b)=>a+b,0)/levels.length):null;
    const chart=renderBarChart("outcomeItem-"+name.replace(/\s+/g,"-"), dates, date=>{
      const scores=outcomeScoresFromRow(rows[date]);
      return outcomeBarSpec(outcomeLevelFromRaw(scores[name]));
    });
    const card=document.createElement("div");
    card.className="chart-card tone-"+tone;
    card.innerHTML=`<div class="outcome-card-head">
      <div class="outcome-card-name">${name}</div>
    </div>`;
    card.appendChild(chart);
    grid.appendChild(card);
  };
  const pairCount=Math.max(goodItems.length, badItems.length);
  for(let i=0;i<pairCount;i++){
    addOutcomeCard(goodItems[i], "good");
    addOutcomeCard(badItems[i], "bad");
  }
  charts.appendChild(grid);
}

function renderChartCard(title, chartEl){
  const card=document.createElement("div");
  card.className="chart-card";
  const heading=document.createElement("div");
  heading.className="chart-title";
  heading.textContent=title;
  card.appendChild(heading);
  card.appendChild(chartEl);
  return card;
}

async function renderEngineDashboard(systemName){
  const defBtn=document.getElementById("engineDefBtn");
  if(defBtn) defBtn.style.display="";
  const page=document.getElementById("engineDashboardPage");
  if(page) page.classList.remove("outcome-mode");
  const systemPage=document.getElementById("systemPage");
  if(systemPage) systemPage.classList.remove("outcome-fit");
  const dayCount=dashRangeDays;
  const dates=getDateRange(dayCount);
  const data=await getEntries(systemName,dates[0],dates[dates.length-1]);
  const logged=dates.filter(d=>!!data[d]);
  const consistency=Math.round(logged.length/dates.length*100)+"%";
  const rangeLabel=dayCount===30?"Last 30 days":"Last 7 days";
  const charts=document.getElementById("engineDashCharts");
  charts.innerHTML="";
  updateDashRangeButtons();

  if(systemName==="Workout"){
    const gymYes=logged.filter(d=>data[d].gym==="yes");
    const cardioYes=logged.filter(d=>data[d].cardio==="yes");
    renderEngineMetrics([
      {label:`GYM DAYS · ${dayCount} DAYS`, value:String(gymYes.length), small:`of ${logged.length} logged`},
      {label:`CARDIO DAYS · ${dayCount} DAYS`, value:String(cardioYes.length), small:`of ${logged.length} logged`},
      {label:"DAYS LOGGED", value:String(logged.length), small:`of ${dayCount}`},
      {label:"LOGGING CONSISTENCY", value:consistency, small:rangeLabel.toLowerCase()}
    ]);
    const ynBar=(value)=>{
      if(!value) return {height:"3px", barClass:"empty-bar"};
      if(value==="yes") return {valueText:"Yes", height:"100%", barClass:"yes-bar"};
      if(value==="off") return {valueText:"Off", height:"50%", barClass:"off-bar"};
      return {valueText:"No", height:"28%", barClass:"no-bar"};
    };
    charts.appendChild(renderChartCard("Gym", renderBarChart("gymChart", dates, date=>ynBar(data[date]?.gym))));
    charts.appendChild(renderChartCard("Cardio", renderBarChart("cardioChart", dates, date=>ynBar(data[date]?.cardio))));
    return;
  }

  if(systemName==="Meditation"){
    const morningYes=logged.filter(d=>data[d].morning==="yes");
    const nightYes=logged.filter(d=>data[d].night==="yes");
    renderEngineMetrics([
      {label:`MORNING SESSIONS · ${dayCount} DAYS`, value:String(morningYes.length), small:`of ${logged.length} logged`},
      {label:`NIGHT SESSIONS · ${dayCount} DAYS`, value:String(nightYes.length), small:`of ${logged.length} logged`},
      {label:"DAYS LOGGED", value:String(logged.length), small:`of ${dayCount}`},
      {label:"LOGGING CONSISTENCY", value:consistency, small:rangeLabel.toLowerCase()}
    ]);
    const medBar=(value)=>{
      if(!value) return {height:"3px", barClass:"empty-bar"};
      if(value==="yes") return {valueText:"Yes", height:"100%", barClass:"yes-bar"};
      return {valueText:"No", height:"28%", barClass:"no-bar"};
    };
    charts.appendChild(renderChartCard("Morning Meditation", renderBarChart("morningChart", dates, date=>medBar(data[date]?.morning))));
    charts.appendChild(renderChartCard("Night Meditation", renderBarChart("nightChart", dates, date=>medBar(data[date]?.night))));
    return;
  }

  const yesDays=logged.filter(d=>data[d].value==="yes");
  const labels={
    Diet:{yes:"DIET FOLLOWED", chart:"Diet Follow-through", success:"Yes", fail:"Missed"},
    Journaling:{yes:"DAYS JOURNALED", chart:"Journaling Streak View", success:"Yes", fail:"No"},
    NoPMO:{yes:"DAYS KEPT", chart:"Daily Commitment", success:"Yes", fail:"No"}
  }[systemName]||{yes:"YES DAYS", chart:"Daily Result", success:"Yes", fail:"No"};
  const followThrough=logged.length?Math.round(yesDays.length/logged.length*100)+"%":"—";
  const streak=currentStreak(dates, d=>data[d]&&data[d].value==="yes");
  renderEngineMetrics([
    {label:`${labels.yes} · ${dayCount} DAYS`, value:String(yesDays.length), small:`${followThrough} of logged days`},
    {label:"CURRENT STREAK", value:String(streak), small:streak===1?"day":"days"},
    {label:"DAYS LOGGED", value:String(logged.length), small:`of ${dayCount}`},
    {label:"LOGGING CONSISTENCY", value:consistency, small:rangeLabel.toLowerCase()}
  ]);
  charts.appendChild(renderChartCard(labels.chart, renderBarChart(systemName+"Chart", dates, date=>{
    const entry=data[date];
    if(!entry||!entry.value) return {height:"3px", barClass:"empty-bar"};
    if(entry.value==="yes") return {valueText:labels.success, height:"100%", barClass:"yes-bar"};
    if(entry.value==="off") return {valueText:"Off", height:"50%", barClass:"off-bar"};
    return {valueText:entry.tier?entry.tier[0].toUpperCase()+entry.tier.slice(1):labels.fail, height:"28%", barClass:"no-bar"};
  })));
}

document.addEventListener("click",(event)=>{
  if(!event.target.closest(".notion-select")) closeNotionSelects();
  if(!event.target.closest(".game-date") && !event.target.closest("#gameCalendarPop")){
    const pop=document.getElementById("gameCalendarPop");
    if(pop) pop.classList.remove("open");
    const trig=document.getElementById("gameCalendarTrigger");
    if(trig) trig.setAttribute("aria-expanded","false");
  }
});

/* ==============================
   GAME DOMAIN — Weekly tracker (Supabase-backed)
   ============================== */
const GAME_ACTIVITIES = [
  ["mondayOffice","Monday Office"],
  ["wednesdaySocials","Wednesday Socials"],
  ["fridayNight","Friday Night"],
  ["saturdayExplore","Saturday Explore"],
  ["sundayZoneLoop","Sunday Zone Loop"]
];
let gamePeriod = "weekly";
let gameOffset = 0;
let gameCalMonth = new Date();
let gameSelectedWeek = null;
let gameEntriesCache = {}; // weekKey -> data (loaded on demand)
let gameInitialized = false;

function gameWeekKey(d){
  let x = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  x.setUTCDate(x.getUTCDate() + 4 - (x.getUTCDay() || 7));
  let y = new Date(Date.UTC(x.getUTCFullYear(), 0, 1));
  return `${x.getUTCFullYear()}-W${String(Math.ceil((((x - y) / 86400000) + 1) / 7)).padStart(2, "0")}`;
}
function gameWeekStart(k){
  let [y, w] = k.split("-W").map(Number);
  let d = new Date(y, 0, 4);
  let day = d.getDay() || 7;
  d.setDate(d.getDate() - day + 1 + (w - 1) * 7);
  d.setHours(0, 0, 0, 0);
  return d;
}
function gameAddWeek(k, n){
  let d = gameWeekStart(k);
  d.setDate(d.getDate() + 7 * n);
  return gameWeekKey(d);
}
function gameFormatWeek(k){
  return `Week ${k.slice(-2)}, ${k.slice(0, 4)}`;
}
function gameCurrentWeek(){ return gameWeekKey(new Date()); }
function gameMondayDate(k){
  return getDateString(gameWeekStart(k));
}

function gameFormData(){
  let a = {};
  GAME_ACTIVITIES.forEach(([key]) => {
    a[key] = document.querySelector(`#gameDomainPage [data-activity="${key}"] .selected`)?.dataset.value || "";
  });
  return {
    daysOut: +document.getElementById("gameDaysOut").value || 0,
    approaches: +document.getElementById("gameApproaches").value || 0,
    rejections: +document.getElementById("gameRejections").value || 0,
    closes: +document.getElementById("gameCloses").value || 0,
    weekKey: gameSelectedWeek,
    ...a
  };
}
function gameFill(d = {}){
  document.getElementById("gameDaysOut").value = d.daysOut ?? 0;
  document.getElementById("gameApproaches").value = d.approaches ?? 0;
  document.getElementById("gameRejections").value = d.rejections ?? 0;
  document.getElementById("gameCloses").value = d.closes ?? 0;
  GAME_ACTIVITIES.forEach(([key]) => {
    document.querySelectorAll(`#gameDomainPage [data-activity="${key}"] button`).forEach(b => {
      b.classList.toggle("selected", b.dataset.value === (d[key] || ""));
    });
  });
}

async function gameLoadWeek(weekKey){
  gameSelectedWeek = weekKey;
  document.getElementById("gameWeekLabel").textContent = gameFormatWeek(weekKey);
  const monday = gameMondayDate(weekKey);
  // Load from cache or cloud
  if(gameEntriesCache[weekKey]){
    gameFill(gameEntriesCache[weekKey]);
  } else {
    const rows = await getEntries("Game", monday, monday);
    const data = rows[monday] || {};
    gameEntriesCache[weekKey] = data;
    gameFill(data);
  }
  gameRenderCalendar();
}

function gameInitEvents(){
  if(gameInitialized) return;
  gameInitialized = true;

  document.getElementById("gamePrevWeek").onclick = () => gameLoadWeek(gameAddWeek(gameSelectedWeek, -1));
  document.getElementById("gameNextWeek").onclick = () => gameLoadWeek(gameAddWeek(gameSelectedWeek, 1));

  document.getElementById("gameCalendarTrigger").onclick = () => {
    const p = document.getElementById("gameCalendarPop");
    p.classList.toggle("open");
    document.getElementById("gameCalendarTrigger").setAttribute("aria-expanded", p.classList.contains("open"));
    if(p.classList.contains("open")){
      const d = gameWeekStart(gameSelectedWeek);
      gameCalMonth = new Date(d.getFullYear(), d.getMonth(), 1);
      gameRenderCalendar();
    }
  };
  document.getElementById("gamePrevMonth").onclick = () => { gameCalMonth.setMonth(gameCalMonth.getMonth() - 1); gameRenderCalendar(); };
  document.getElementById("gameNextMonth").onclick = () => { gameCalMonth.setMonth(gameCalMonth.getMonth() + 1); gameRenderCalendar(); };
  document.getElementById("gameCalClose").onclick = () => {
    document.getElementById("gameCalendarPop").classList.remove("open");
    document.getElementById("gameCalendarTrigger").setAttribute("aria-expanded", "false");
  };
  document.getElementById("gameCalToday").onclick = () => {
    gameLoadWeek(gameCurrentWeek());
    gameCalMonth = new Date();
    document.getElementById("gameCalendarPop").classList.remove("open");
    document.getElementById("gameCalendarTrigger").setAttribute("aria-expanded", "false");
  };

  document.querySelectorAll("#gameDomainPage .game-yn").forEach(group => {
    group.onclick = e => {
      const b = e.target.closest("button[data-value]");
      if(!b) return;
      group.querySelectorAll("button").forEach(x => x.classList.toggle("selected", x === b));
    };
  });

  document.getElementById("gameSaveBtn").onclick = async () => {
    if(!currentUser){ alert("Please log in first."); return; }
    const payload = gameFormData();
    const monday = gameMondayDate(gameSelectedWeek);
    const ok = await saveSystemEntry("Game", monday, payload);
    if(ok){
      gameEntriesCache[gameSelectedWeek] = payload;
      const btn = document.getElementById("gameSaveBtn");
      btn.textContent = "Saved";
      setTimeout(() => btn.textContent = "Save Entry", 900);
    }
  };
  document.getElementById("gameClearBtn").onclick = () => gameFill({});

  document.querySelectorAll("#gameDomainPage .game-subtab").forEach(b => {
    b.onclick = () => {
      gamePeriod = b.dataset.period;
      gameOffset = 0;
      document.querySelectorAll("#gameDomainPage .game-subtab").forEach(x => x.classList.toggle("active", x === b));
      gameRenderDashboard();
    };
  });
  document.getElementById("gamePrevPeriod").onclick = () => { gameOffset--; gameRenderDashboard(); };
  document.getElementById("gameNextPeriod").onclick = () => { gameOffset++; gameRenderDashboard(); };
}

function gameRenderCalendar(){
  const y = gameCalMonth.getFullYear(), m = gameCalMonth.getMonth();
  document.getElementById("gameCalMonth").textContent = gameCalMonth.toLocaleDateString("en-US", {month: "long", year: "numeric"});
  const first = new Date(y, m, 1);
  const offsetMon = (first.getDay() + 6) % 7;
  const start = new Date(y, m, 1 - offsetMon);
  let html = '<div class="game-cal-label">Wk</div>' + ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(x => `<div class="game-cal-label">${x}</div>`).join("");
  const todayKey = gameCurrentWeek();
  for(let row = 0; row < 6; row++){
    const rowStart = new Date(start);
    rowStart.setDate(start.getDate() + row * 7);
    const rowKey = gameWeekKey(rowStart);
    const cls = rowKey < todayKey ? "past" : rowKey > todayKey ? "future" : "current";
    const wk = Number(rowKey.slice(-2));
    html += `<div class="game-week-no">${wk}</div>`;
    for(let col = 0; col < 7; col++){
      const d = new Date(rowStart);
      d.setDate(rowStart.getDate() + col);
      const outside = d.getMonth() !== m;
      const selected = gameWeekKey(d) === gameSelectedWeek;
      html += `<button class="game-cal-day ${cls}${outside ? " outside" : ""}${selected ? " selected" : ""}" data-date="${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}">${d.getDate()}</button>`;
    }
  }
  const grid = document.getElementById("gameCalendarGrid");
  grid.innerHTML = html;
  grid.querySelectorAll("[data-date]").forEach(b => {
    b.onclick = () => {
      const d = new Date(b.dataset.date + "T12:00:00");
      gameLoadWeek(gameWeekKey(d));
      document.getElementById("gameCalendarPop").classList.remove("open");
      document.getElementById("gameCalendarTrigger").setAttribute("aria-expanded", "false");
    };
  });
}

function gameSum(arr, k){ return arr.reduce((n, x) => n + (+x[k] || 0), 0); }
function gameAvg(arr, k){
  const v = arr.filter(x => x[k] > 0);
  return v.length ? (v.reduce((n, x) => n + x[k], 0) / v.length).toFixed(1) : "—";
}

async function gameSelectedEntries(){
  if(gamePeriod === "weekly"){
    const key = gameAddWeek(gameCurrentWeek(), gameOffset);
    // ensure loaded
    if(!gameEntriesCache[key]){
      const monday = gameMondayDate(key);
      const rows = await getEntries("Game", monday, monday);
      gameEntriesCache[key] = rows[monday] || {};
    }
    const data = gameEntriesCache[key];
    const has = data && (data.approaches != null || data.daysOut != null || data.rejections != null || data.closes != null || data.mondayOffice || data.wednesdaySocials);
    return { arr: has ? [data] : [], keys: has ? [key] : [], label: gameFormatWeek(key) };
  }
  // monthly
  const d = new Date();
  d.setMonth(d.getMonth() + gameOffset);
  d.setDate(1);
  const mk = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
  // load a reasonable range of weeks for the month
  const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
  const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  const startKey = gameWeekKey(monthStart);
  const endKey = gameWeekKey(monthEnd);
  // load all Mondays in range
  let k = startKey;
  const found = [];
  while(true){
    if(!gameEntriesCache[k]){
      const monday = gameMondayDate(k);
      const rows = await getEntries("Game", monday, monday);
      gameEntriesCache[k] = rows[monday] || {};
    }
    const data = gameEntriesCache[k];
    if(data && (data.approaches != null || data.daysOut != null || data.rejections != null || data.closes != null || data.mondayOffice || data.wednesdaySocials)){
      found.push({ key: k, data });
    }
    if(k === endKey) break;
    k = gameAddWeek(k, 1);
    if(k > endKey && k.slice(0,4) !== endKey.slice(0,4)) break; // safety
  }
  return {
    arr: found.map(x => x.data),
    keys: found.map(x => x.key),
    label: d.toLocaleDateString("en-US", {month: "long", year: "numeric"})
  };
}

async function gameRenderDashboard(){
  const { arr, keys, label } = await gameSelectedEntries();
  document.getElementById("gamePeriodLabel").textContent = label;
  document.getElementById("gameTrendTitle").textContent = gamePeriod === "weekly" ? "Weekly Activity" : "Monthly Activity";
  const days = gameSum(arr, "daysOut");
  const a = gameSum(arr, "approaches");
  const r = gameSum(arr, "rejections");
  const c = gameSum(arr, "closes");
  document.getElementById("gameKDays").textContent = days;
  document.getElementById("gameKApproaches").textContent = a;
  document.getElementById("gameKRejections").textContent = r;
  document.getElementById("gameKCloses").textContent = c;
  const closePct = a ? (c / a * 100) : 0;
  const rejectPct = a ? (r / a * 100) : 0;
  document.getElementById("gameCloseRate").textContent = a ? `${closePct.toFixed(1)}%` : "0%";
  document.getElementById("gameRejectRate").textContent = a ? `${rejectPct.toFixed(1)}%` : "0%";
  gameDrawPie(c, r);
  gameDrawChart(arr, keys);
  gameRenderActivitySummary(arr);
}

function gameDrawPie(closes, rejections){
  const svg = document.getElementById("gameOutcomePie");
  if(!svg) return;
  const total = closes + rejections;
  if(!total){
    svg.innerHTML = `<circle cx="60" cy="60" r="48" fill="#1a2636" stroke="#2a3b50" stroke-width="1"/><text x="60" y="64" text-anchor="middle" fill="#91a4bd" font-size="11">No data</text>`;
    return;
  }
  const cAng = (closes / total) * 360;
  const rAng = (rejections / total) * 360;
  function arc(startDeg, sweepDeg, color){
    if(sweepDeg <= 0) return "";
    if(sweepDeg >= 359.9) return `<circle cx="60" cy="60" r="48" fill="${color}"/>`;
    const r = 48, cx = 60, cy = 60;
    const start = (startDeg - 90) * Math.PI / 180;
    const end = (startDeg + sweepDeg - 90) * Math.PI / 180;
    const x1 = cx + r * Math.cos(start), y1 = cy + r * Math.sin(start);
    const x2 = cx + r * Math.cos(end), y2 = cy + r * Math.sin(end);
    const large = sweepDeg > 180 ? 1 : 0;
    return `<path d="M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z" fill="${color}"/>`;
  }
  svg.innerHTML = arc(0, cAng, "#35d6a0") + arc(cAng, rAng, "#f16c82") + `<circle cx="60" cy="60" r="26" fill="#0e1825"/>`;
}

function gameDrawChart(data, keys){
  let s = "", base = 174, top = 15;
  const series = [["daysOut","#f3c969"],["approaches","#3986ff"],["rejections","#f16c82"],["closes","#35d6a0"]];
  const max = Math.max(5, ...data.flatMap(x => series.map(([k]) => +x[k] || 0)));
  for(let i = 0; i < 5; i++){
    const y = base - (base - top) * i / 4;
    s += `<line x1="38" y1="${y}" x2="605" y2="${y}" stroke="#23364b"/><text x="28" y="${y + 4}" text-anchor="end">${Math.round(max * i / 4)}</text>`;
  }
  if(data.length){
    const group = 550 / data.length;
    data.forEach((d, i) => {
      series.forEach(([k, col], j) => {
        const v = +d[k] || 0;
        const h = (base - top) * v / max;
        const x = 48 + i * group + group * .12 + j * group * .18;
        s += `<rect x="${x}" y="${base - h}" width="${Math.max(6, group * .14)}" height="${h}" rx="3" fill="${col}"/>`;
      });
      const k = keys[i] || "";
      s += `<text x="${48 + i * group + group * .48}" y="197" text-anchor="middle">${gamePeriod === "weekly" ? "Week" : k.slice(-2)}</text>`;
    });
  } else {
    s += '<text x="310" y="100" text-anchor="middle">Save a weekly entry to see your activity</text>';
  }
  document.getElementById("gameActivityChart").innerHTML = s;
}

function gameRenderActivitySummary(arr){
  document.getElementById("gameActivitySummary").innerHTML = GAME_ACTIVITIES.map(([key, name]) => {
    const vals = arr.map(x => x[key]).filter(Boolean);
    const yes = vals.filter(x => x === "Yes").length;
    const no = vals.filter(x => x === "No").length;
    let content = gamePeriod === "weekly" ? (vals[0] || "Not recorded") : `${yes} Yes · ${no} No`;
    let cls = content === "Yes" ? "yes" : content === "No" ? "no" : "";
    return `<div class="game-summary-item"><span>${name}</span><span class="game-status ${cls}">${content}</span></div>`;
  }).join("");
}

async function showGameDomain(section){
  const domainShell=document.getElementById("domainWorkspaceShell");
  if(domainShell) domainShell.classList.add("is-domain-active");
  hideWorkspacePages();
  // Show placeholderPage only for the domain nav bar; hide its panel/content
  const ph = document.getElementById("placeholderPage");
  ph.style.display = "block";
  ph.style.textAlign = "left";
  ph.style.padding = "0";
  ph.style.background = "transparent";
  ph.style.border = "0";
  ph.style.boxShadow = "none";
  ph.style.minHeight = "0";
  document.getElementById("domainSectionNav").style.display = "flex";
  document.getElementById("domainSectionPanel").style.display = "none";
  document.getElementById("genericPlaceholderContent").style.display = "none";
  document.getElementById("gameDomainPage").style.display = "block";
  document.getElementById("workspaceTitle").textContent = "Game";
  document.getElementById("workspaceSub").textContent = "";
  document.querySelectorAll("#domainSectionNav .domain-section-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.domainSection === section);
  });
  gameInitEvents();
  if(!gameSelectedWeek) gameSelectedWeek = gameCurrentWeek();
  if(section === "entry"){
    document.getElementById("gameEntryView").classList.add("active");
    document.getElementById("gameDashboardView").classList.remove("active");
    await gameLoadWeek(gameSelectedWeek);
  } else if(section === "dashboard"){
    document.getElementById("gameEntryView").classList.remove("active");
    document.getElementById("gameDashboardView").classList.add("active");
    await gameRenderDashboard();
  }
}


function resetPlaceholderStyles(){
  const ph = document.getElementById("placeholderPage");
  if(!ph) return;
  ph.style.textAlign = "";
  ph.style.padding = "";
  ph.style.background = "";
  ph.style.border = "";
  ph.style.boxShadow = "";
  ph.style.minHeight = "";
}

// Patch selectDomainSection and renderWorkspace for Game
const originalSelectDomainSection = selectDomainSection;
selectDomainSection = async function(section){
  domainSection = section;
  const isDomain = currentLayer === 3 && currentItem > 0;
  const name = (layerItems[3] || [])[currentItem - 1] || "";
  if(isDomain && name === "Game" && (section === "entry" || section === "dashboard")){
    document.getElementById("dashboardTab").classList.toggle("active", section === "dashboard");
    document.getElementById("analyticsTab").classList.remove("active");
    await showGameDomain(section);
    return;
  }
  // hide game page for definition / other systems
  const gamePage = document.getElementById("gameDomainPage");
  if(gamePage) gamePage.style.display = "none";
  resetPlaceholderStyles();
  return originalSelectDomainSection(section);
};

const originalRenderWorkspace = renderWorkspace;
renderWorkspace = async function(){
  if(osMode || !currentUser) return;
  const systemName = currentItem >= 1 ? personalSystemName(currentItem) : null;
  const name = systemName || (layerItems[currentLayer] || [])[currentItem - 1] || "";
  if(currentLayer === 3 && name === "Game" && workspaceMode === "system"){
    // Prefer domainSection; fall back to currentPage for top Dashboard/Analytics tabs
    let section = domainSection;
    if(currentPage === "dashboard" || currentPage === "analytics") section = "dashboard";
    if(currentPage === "entry") section = "entry";
    if(section === "definition"){
      // fall through to original for definition
    } else if(section === "entry" || section === "dashboard"){
      await showGameDomain(section);
      return;
    }
  }
  const gamePage = document.getElementById("gameDomainPage");
  if(gamePage) gamePage.style.display = "none";
  resetPlaceholderStyles();
  return originalRenderWorkspace();
};



// Domain Engine workspace shell: group the system title, section tabs and active content
// into one continuous panel without changing the underlying page or tracker logic.
(function buildDomainWorkspaceShell(){
  const systemPage = document.getElementById("systemPage");
  if(!systemPage || document.getElementById("domainWorkspaceShell")) return;
  const mobileHome = document.getElementById("mobileHomePage");
  const shell = document.createElement("div");
  shell.id = "domainWorkspaceShell";
  shell.className = "domain-workspace-shell";
  if(mobileHome && mobileHome.parentNode === systemPage) systemPage.insertBefore(shell, mobileHome.nextSibling);
  else systemPage.appendChild(shell);

  const head = systemPage.querySelector(":scope > .workspace-head");
  const nav = document.getElementById("domainSectionNav");
  if(head) shell.appendChild(head);
  if(nav) shell.appendChild(nav);
  Array.from(systemPage.children).forEach(child => {
    if(child !== mobileHome && child !== shell) shell.appendChild(child);
  });
})();


(function(){
const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
let entries = {};
let entriesLoadedForUser = null;
let loadPromise = null;
const $ = id => document.getElementById(id);
function getDateString(d){
  const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,"0"), day=String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
}
function weekKey(d){
  let x = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  x.setUTCDate(x.getUTCDate() + 4 - (x.getUTCDay() || 7));
  let y = new Date(Date.UTC(x.getUTCFullYear(), 0, 1));
  return `${x.getUTCFullYear()}-W${String(Math.ceil((((x - y) / 86400000) + 1) / 7)).padStart(2, "0")}`;
}
function weekStart(k){
  let [y, w] = k.split("-W").map(Number);
  let d = new Date(y, 0, 4);
  let day = d.getDay() || 7;
  d.setDate(d.getDate() - day + 1 + (w - 1) * 7);
  d.setHours(0, 0, 0, 0);
  return d;
}
function weekDate(k){ return getDateString(weekStart(k)); }
function addWeek(k,n){let d=weekStart(k);d.setDate(d.getDate()+7*n);return weekKey(d);}
function formatWeek(k){return `Week ${k.slice(-2)}, ${k.slice(0,4)}`;}
function currentWeek(){return weekKey(new Date());}
function currentMonthKey(offset=0){const d=new Date();d.setDate(1);d.setMonth(d.getMonth()+offset);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;}
let selectedWeek=currentWeek(), calMonth=new Date(), dashboardPeriod="weekly", periodOffset=0;

function normalizeWritingRecord(date, payload){
  const key = payload?.weekKey || weekKey(new Date(date+"T12:00:00"));
  return {...(payload||{}), weekKey:key};
}
async function loadWritingEntries(){
  if(!currentUser) return false;
  if(entriesLoadedForUser===currentUser.id) return true;
  if(loadPromise) return loadPromise;
  loadPromise=(async()=>{
    // Read the canonical Writing records from the same Supabase table used by every
    // other Personal OS workspace.
    const dbEntries=await getEntries("Writing");
    const loaded={};
    Object.entries(dbEntries||{}).forEach(([date,payload])=>{
      const normalized=normalizeWritingRecord(date,payload);
      loaded[normalized.weekKey]=normalized;
    });

    // One-time recovery/migration of entries created by the earlier browser-only build.
    // Existing Supabase rows always win; local-only weeks are copied to Supabase.
    let legacy={};
    try { legacy=JSON.parse(localStorage.getItem("personalOS_writingEntries_v1")||"{}")||{}; }
    catch(e){ console.warn("Could not parse legacy local Writing entries",e); }
    let migrated=false;
    for(const [key,payload] of Object.entries(legacy)){
      if(!/^\d{4}-W\d{2}$/.test(key) || loaded[key]) continue;
      const record={...payload,weekKey:key};
      const ok=await saveSystemEntry("Writing",weekDate(key),record);
      if(ok){loaded[key]=record;migrated=true;}
    }
    entries=loaded;
    entriesLoadedForUser=currentUser.id;
    return true;
  })().finally(()=>{loadPromise=null;});
  return loadPromise;
}
function readForm(){
  const developmental={}, refinement={};
  document.querySelectorAll("#writingDomainPage [data-day-dev]").forEach(i=>developmental[i.dataset.dayDev]=Math.max(0,Number(i.value)||0));
  document.querySelectorAll("#writingDomainPage [data-day-ref]").forEach(i=>refinement[i.dataset.dayRef]=Math.max(0,Number(i.value)||0));
  return {
    weekKey:selectedWeek,
    developmental,
    refinement,
    threadsExpanded:Math.max(0,Number($("threadsExpanded").value)||0),
    articlesCompleted:Math.max(0,Number($("articlesCompletedInput").value)||0)
  };
}
async function loadForm(key){
  selectedWeek=key;
  if(currentUser) await loadWritingEntries();
  $("writingWeekLabel").textContent=formatWeek(key);
  const e=entries[key]||{developmental:{},refinement:{}};
  document.querySelectorAll("#writingDomainPage [data-day-dev]").forEach(i=>i.value=e.developmental?.[i.dataset.dayDev]??"");
  document.querySelectorAll("#writingDomainPage [data-day-ref]").forEach(i=>i.value=e.refinement?.[i.dataset.dayRef]??"");
  $("threadsExpanded").value=e.threadsExpanded??"";
  $("articlesCompletedInput").value=e.articlesCompleted??"";
  updateEntryTotals();
  renderCalendar();
}
function updateEntryTotals(){
  const dev=[...document.querySelectorAll("#writingDomainPage [data-day-dev]")].reduce((s,i)=>s+(Number(i.value)||0),0);
  const ref=[...document.querySelectorAll("#writingDomainPage [data-day-ref]")].reduce((s,i)=>s+(Number(i.value)||0),0);
  $("developmentalTotal").textContent=dev.toLocaleString();
  $("refinementTotal").textContent=ref.toLocaleString();
}
async function save(){
  if(!currentUser){alert("Please log in first.");return;}
  const payload=readForm();
  $("saveBtn").disabled=true;
  const oldLabel=$("saveBtn").textContent;
  $("saveBtn").textContent="Saving…";
  const ok=await saveSystemEntry("Writing",weekDate(selectedWeek),payload);
  $("saveBtn").disabled=false;
  if(!ok){$("saveBtn").textContent=oldLabel;return;}
  entries[selectedWeek]=payload;
  $("saveBtn").textContent="Saved";
  setTimeout(()=>$("saveBtn").textContent="Save",900);
  await renderDashboard();
}
function renderCalendar(){
  const y=calMonth.getFullYear(),m=calMonth.getMonth();
  $("writingCalMonth").textContent=calMonth.toLocaleDateString("en-US",{month:"long",year:"numeric"});
  const first=new Date(y,m,1),offsetMon=(first.getDay()+6)%7,start=new Date(y,m,1-offsetMon);
  let html='<div class="game-cal-label">Wk</div>'+["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(x=>`<div class="game-cal-label">${x}</div>`).join("");
  const todayKey=currentWeek();
  for(let row=0;row<6;row++){
    const rowStart=new Date(start);rowStart.setDate(start.getDate()+row*7);
    const rowKey=weekKey(rowStart),cls=rowKey<todayKey?"past":rowKey>todayKey?"future":"current";
    html+=`<div class="game-week-no">${Number(rowKey.slice(-2))}</div>`;
    for(let col=0;col<7;col++){
      const d=new Date(rowStart);d.setDate(rowStart.getDate()+col);
      const outside=d.getMonth()!==m,selected=weekKey(d)===selectedWeek;
      html+=`<button class="game-cal-day ${cls}${outside?" outside":""}${selected?" selected":""}" data-date="${getDateString(d)}">${d.getDate()}</button>`;
    }
  }
  $("writingCalendarGrid").innerHTML=html;
  $("writingCalendarGrid").querySelectorAll("[data-date]").forEach(b=>b.onclick=async()=>{
    const d=new Date(b.dataset.date+"T12:00:00");await loadForm(weekKey(d));
    $("writingCalendarPop").classList.remove("open");$("writingCalendarTrigger").setAttribute("aria-expanded","false");
  });
}
function getPeriodEntries(){
  if(dashboardPeriod==="weekly"){
    const key=addWeek(currentWeek(),periodOffset),e=entries[key];
    return {items:e?[{key,data:e}]:[],label:formatWeek(key)};
  }
  const [yy,mm]=currentMonthKey(periodOffset).split("-").map(Number);
  const d=new Date(yy,mm-1,1),end=new Date(yy,mm,0);
  const startKey=weekKey(d),endKey=weekKey(end),items=[];
  let k=startKey;
  while(true){
    if(entries[k])items.push({key:k,data:entries[k]});
    if(k===endKey)break;
    k=addWeek(k,1);
  }
  return {items,label:d.toLocaleDateString("en-US",{month:"long",year:"numeric"})};
}
function entryDayTotal(entry, type, day){return Number(entry[type]?.[day])||0;}
function barHeight(val, max, minPx, maxPx){
  if(!val || val <= 0 || max <= 0) return 0;
  return Math.max(minPx, Math.round((val / max) * maxPx));
}
async function renderDashboard(){
  if(!currentUser) return;
  await loadWritingEntries();
  const {items,label}=getPeriodEntries(),arr=items.map(x=>x.data),keys=items.map(x=>x.key);
  $("writingPeriodLabel").textContent=label;
  $("writingTrendTitle").textContent=dashboardPeriod==="weekly"?"Weekly Writing Activity":"Monthly Writing Activity";
  const dev=arr.reduce((s,e)=>s+DAYS.reduce((n,d)=>n+entryDayTotal(e,"developmental",d),0),0);
  const ref=arr.reduce((s,e)=>s+DAYS.reduce((n,d)=>n+entryDayTotal(e,"refinement",d),0),0);
  const threads=arr.reduce((s,e)=>s+(Number(e.threadsExpanded)||0),0);
  const articles=arr.reduce((s,e)=>s+(Number(e.articlesCompleted)||0),0);
  const sessions=dev+ref;
  $("developmentalSessions").textContent=dev.toLocaleString();
  $("refinementSessions").textContent=ref.toLocaleString();
  $("threadsExpandedTotal").textContent=threads.toLocaleString();
  $("articlesCompleted").textContent=articles.toLocaleString();
  $("writingSessions").textContent=sessions.toLocaleString();
  $("publishedCount").textContent=articles.toLocaleString();
  $("typeBreakdown").innerHTML=[
    `<div class="wd-breakdown-item"><span>Developmental Writing</span><strong>${dev.toLocaleString()}</strong></div>`,
    `<div class="wd-breakdown-item"><span>Refinement Work</span><strong>${ref.toLocaleString()}</strong></div>`,
    `<div class="wd-breakdown-item"><span>Threads Expanded</span><strong>${threads.toLocaleString()}</strong></div>`,
    `<div class="wd-breakdown-item"><span>Articles Completed</span><strong>${articles.toLocaleString()}</strong></div>`
  ].join("");

  // Inputs / Outputs activity bars
  const actMax = Math.max(1, dev, ref, threads, articles);
  const setAct = (valId, barId, val) => {
    const el = $(valId); if(el) el.textContent = String(val);
    const bar = $(barId);
    if(bar){
      const h = barHeight(val, actMax, 6, 96);
      bar.style.height = h + "px";
      bar.classList.toggle("is-zero", !val || val <= 0);
    }
  };
  setAct("actDevVal", "actDevBar", dev);
  setAct("actRefVal", "actRefBar", ref);
  setAct("actThreadsVal", "actThreadsBar", threads);
  setAct("actArticlesVal", "actArticlesBar", articles);

  // Daily dual-bar chart (Monday–Sunday) — value sits on each bar and moves with height
  const dayTotals = DAYS.map(day => ({
    dev: arr.reduce((s,e)=>s+entryDayTotal(e,"developmental",day),0),
    ref: arr.reduce((s,e)=>s+entryDayTotal(e,"refinement",day),0)
  }));
  const dayMax = Math.max(1, ...dayTotals.flatMap(x => [x.dev, x.ref]));
  $("writingActivitySummary").innerHTML = dayTotals.map((t,i) => {
    const dh = barHeight(t.dev, dayMax, 4, 48);
    const rh = barHeight(t.ref, dayMax, 4, 48);
    const dZero = !t.dev ? " is-zero" : "";
    const rZero = !t.ref ? " is-zero" : "";
    return `<div class="wd-daily-col" data-day="${DAYS[i]}">
      <div class="wd-daily-bars">
        <div class="wd-daily-stack">
          <span class="wd-daily-val">${t.dev}</span>
          <div class="wd-daily-bar yellow${dZero}" style="height:${dh}px"></div>
        </div>
        <div class="wd-daily-stack">
          <span class="wd-daily-val">${t.ref}</span>
          <div class="wd-daily-bar blue${rZero}" style="height:${rh}px"></div>
        </div>
      </div>
      <span class="wd-daily-label">${DAYS[i]}</span>
    </div>`;
  }).join("");
}
function drawWritingChart(arr,keys){ /* replaced by DOM bar rendering in renderDashboard */ }
async function showSection(section){
  $("writingEntryView").classList.toggle("active",section==="entry");
  $("writingDashboardView").classList.toggle("active",section==="dashboard");
  $("writingDomainPage").style.display=section==="definition"?"none":"block";
  if(section==="entry")await loadForm(selectedWeek||currentWeek());
  if(section==="dashboard")await renderDashboard();
}
window.showWritingWorkspaceSection = showSection;
document.querySelectorAll("#writingDomainPage [data-day-dev],#writingDomainPage [data-day-ref]").forEach(i=>i.addEventListener("input",updateEntryTotals));
$("writingPrevWeek").onclick=()=>loadForm(addWeek(selectedWeek,-1));
$("writingNextWeek").onclick=()=>loadForm(addWeek(selectedWeek,1));
$("writingCalendarTrigger").onclick=()=>{
  const p=$("writingCalendarPop");p.classList.toggle("open");
  $("writingCalendarTrigger").setAttribute("aria-expanded",p.classList.contains("open"));
  if(p.classList.contains("open")){const d=weekStart(selectedWeek);calMonth=new Date(d.getFullYear(),d.getMonth(),1);renderCalendar();}
};
$("writingPrevMonth").onclick=()=>{calMonth.setMonth(calMonth.getMonth()-1);renderCalendar();};
$("writingNextMonth").onclick=()=>{calMonth.setMonth(calMonth.getMonth()+1);renderCalendar();};
$("writingCalClose").onclick=()=>{$("writingCalendarPop").classList.remove("open");$("writingCalendarTrigger").setAttribute("aria-expanded","false");};
$("writingCalToday").onclick=()=>{loadForm(currentWeek());calMonth=new Date();$("writingCalendarPop").classList.remove("open");$("writingCalendarTrigger").setAttribute("aria-expanded","false");};
$("saveBtn").onclick=save;
document.querySelectorAll("#writingDomainPage [data-writing-period]").forEach(b=>b.onclick=()=>{
  dashboardPeriod=b.dataset.writingPeriod;periodOffset=0;
  document.querySelectorAll("#writingDomainPage [data-writing-period]").forEach(x=>x.classList.toggle("active",x===b));
  renderDashboard();
});
/* wd-subtab active styling is handled by the same data-writing-period selector above */
$("writingPrevPeriod").onclick=()=>{periodOffset--;renderDashboard();};
$("writingNextPeriod").onclick=()=>{periodOffset++;renderDashboard();};

window.initWritingWorkspace = async function(){
  if(!currentUser) return;
  await loadWritingEntries();
  await loadForm(selectedWeek);
  await renderDashboard();
};
})();

// Writing Domain Workspace integration — preserves the existing Personal OS navigation and shell.
function resetWritingPlaceholderStyles(){
  const ph=document.getElementById("placeholderPage");
  if(!ph) return;
  ph.style.textAlign=""; ph.style.padding=""; ph.style.background="";
  ph.style.border=""; ph.style.boxShadow=""; ph.style.minHeight="";
}
async function showWritingDomain(section){
  const shell=document.getElementById("domainWorkspaceShell");
  if(shell) shell.classList.add("is-domain-active");
  hideWorkspacePages();
  const ph=document.getElementById("placeholderPage");
  ph.style.display="block"; ph.style.textAlign="left"; ph.style.padding="0";
  ph.style.background="transparent"; ph.style.border="0"; ph.style.boxShadow="none"; ph.style.minHeight="0";
  document.getElementById("domainSectionNav").style.display="flex";
  document.getElementById("domainSectionPanel").style.display="none";
  document.getElementById("genericPlaceholderContent").style.display="none";
  document.getElementById("gameDomainPage").style.display="none";
  document.getElementById("writingDomainPage").style.display=section==="definition"?"none":"block";
  document.getElementById("workspaceTitle").textContent="Writing";
  document.getElementById("workspaceSub").textContent="";
  document.querySelectorAll("#domainSectionNav .domain-section-btn").forEach(btn=>{
    btn.classList.toggle("active",btn.dataset.domainSection===section);
  });
  if(window.showWritingWorkspaceSection) window.showWritingWorkspaceSection(section);
  if(section==="definition"){
    document.getElementById("writingDomainPage").style.display="none";
  }
}
const selectDomainSectionWithWriting = selectDomainSection;
selectDomainSection = async function(section){
  const isWriting=currentLayer===3 && ((layerItems[3]||[])[currentItem-1]||"")==="Writing";
  if(isWriting && section==="definition"){
    domainSection=section;
    workspaceMode="system";
    currentPage="definition";
    document.getElementById("writingDomainPage").style.display="none";
    // Reuse the original Personal OS Definition editor and its Supabase-backed
    // system_entries record for the Writing system.
    return selectDomainSectionWithWriting("definition");
  }
  if(isWriting && ["entry","dashboard"].includes(section)){
    domainSection=section; workspaceMode="system"; currentPage=section;
    document.getElementById("dashboardTab").classList.toggle("active",section==="dashboard");
    document.getElementById("analyticsTab").classList.remove("active");
    await showWritingDomain(section);
    return;
  }
  const writing=document.getElementById("writingDomainPage");
  if(writing) writing.style.display="none";
  resetWritingPlaceholderStyles();
  return selectDomainSectionWithWriting(section);
};
const renderWorkspaceWithWriting = renderWorkspace;
renderWorkspace = async function(){
  const isWriting=!osMode && currentUser && currentLayer===3 &&
    (((layerItems[3]||[])[currentItem-1]||"")==="Writing") && workspaceMode==="system";
  if(isWriting){
    let section=domainSection;
    if(currentPage==="dashboard" || currentPage==="analytics") section="dashboard";
    if(currentPage==="entry") section="entry";
    await showWritingDomain(section);
    return;
  }
  const writing=document.getElementById("writingDomainPage");
  if(writing) writing.style.display="none";
  resetWritingPlaceholderStyles();
  return renderWorkspaceWithWriting();
};

let savedTheme="dark";
try{savedTheme=localStorage.getItem("personalOS_theme")||"dark";}catch(e){}
applyTheme(savedTheme==="light"?"light":"dark");
initializeApp();

// =========================================================
// WORKSPACE LOADER — loads per-system HTML into #workspaceContent
// =========================================================
const workspaceMap = {
  // Personal Engine
  "overview": "systems/personal/overview.html",
  "entry": "systems/personal/entry.html",
  "Morning": "systems/personal/morning.html",
  "Night": "systems/personal/night.html",
  "Sleep": "systems/personal/sleep.html",
  "Workout": "systems/personal/workout.html",
  "Meditation": "systems/personal/meditation.html",
  "Diet": "systems/personal/diet.html",
  "NoPMO": "systems/personal/nopmo.html",
  "Scrolling": "systems/personal/scrolling.html",
  "Journaling": "systems/personal/journaling.html",
  "Reading": "systems/personal/reading.html",
  "Calisthenics": "systems/personal/calisthenics.html",
  "Errands": "systems/personal/errands.html",
  // Productivity Engine
  "Day": "systems/productivity/day.html",
  "Week": "systems/productivity/week.html",
  "Bi-week": "systems/productivity/bi-week.html",
  "Month": "systems/productivity/month.html",
  "Quarter": "systems/productivity/quarter.html",
  "Bi-quarter": "systems/productivity/bi-quarter.html",
  "Year": "systems/productivity/year.html",
  // Domain Engine
  "Writing": "systems/domain/writing.html",
  "Projects": "systems/domain/projects.html",
  "Money": "systems/domain/money.html",
  "Fitness": "systems/domain/fitness.html",
  "Game": "systems/domain/game.html",
  "Speaking": "systems/domain/speaking.html",
  "Upskilling": "systems/domain/upskilling.html"
};

async function loadWorkspace(key){
  const path = workspaceMap[key];
  const container = document.getElementById("workspaceContent");
  if(!container) return;
  if(!path){
    container.innerHTML = `<div class="placeholder"><strong>${key || "Workspace"}</strong><p>No workspace file defined yet.</p></div>`;
    return;
  }
  try{
    const res = await fetch(path);
    if(!res.ok) throw new Error(res.statusText);
    const html = await res.text();
    container.innerHTML = html;
  }catch(e){
    container.innerHTML = `<div class="placeholder"><strong>Could not load workspace</strong><p>${e.message}</p></div>`;
  }
}

// Hook into existing selection so workspaces load automatically
const _origSelectItem = window.selectItem;
window.selectItem = async function(item){
  if(typeof _origSelectItem === "function") await _origSelectItem(item);
  const name = (typeof personalSystemName === "function") ? personalSystemName(item) : null;
  if(name) await loadWorkspace(name);
};

const KEY='my-coach-v1';const dateNow=()=>new Date().toLocaleDateString('en-CA');const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const initial={profile:{age:45,height:177,goalWeight:90,calories:2150,protein:180,trainingDays:4,trainingTime:'07:00',firstMeal:'10:00'},weights:[{date:'2026-11-08',weight:99.4}],measurements:[],day:2,openDay:7,done:{},water:{},chat:[],provider:'claude',notes:[],startDate:'2026-11-08'};
let state;try{state={...initial,...JSON.parse(localStorage.getItem(KEY)||'{}')}}catch{state=structuredClone(initial)};
// One-time migration for the previously published demo plan; preserve all logged measurements and weights.
if(!state.planVersion || state.planVersion<2){
  const wasDemo=state.startDate==='2026-11-09' || !state.startDate;
  state.startDate='2026-11-08';
  if(wasDemo && state.day===1 && !Object.keys(state.done||{}).length)state.day=2;
  state.openDay=state.openDay??7;
  state.planVersion=2;
  localStorage.setItem(KEY,JSON.stringify(state));
}
const save=()=>localStorage.setItem(KEY,JSON.stringify(state));const latest=()=>[...state.weights].sort((a,b)=>a.date.localeCompare(b.date)).at(-1);const fmt=x=>Number(x).toLocaleString('ar-KW',{maximumFractionDigits:1});const days=[
[{t:'الفطور',name:'بيض وجبن قريش وفراولة',detail:'بيضتان كاملتان + 200 غ بياض بيض + 25 غ جبن فيتا + 40 غ خبز أسمر + 150 غ فراولة + 5 غ زيت زيتون',time:'10:00'},{t:'الغداء',name:'صدر دجاج ورز بسمتي',detail:'200 غ صدر دجاج مشوي + 150 غ رز بسمتي مطبوخ + 200 غ سلطة + 5 غ زيت زيتون',time:'14:30'},{t:'سناك',name:'زبادي يوناني وتمر وتفاح',detail:'200 غ زبادي يوناني عالي البروتين + تمرتان صغيرتان + 150 غ تفاح',time:'17:30'},{t:'العشاء',name:'ستيك لحم وبطاطا',detail:'170 غ ستيك لحم قليل الدهون + 180 غ بطاطا بالفرن + 200 غ خضار',time:'20:30'}],
[{t:'الفطور',name:'لحم مفروم وبيض',detail:'120 غ لحم مفروم قليل الدهون + بيضتان كاملتان + 100 غ طماطم + 40 غ خبز أسمر + 100 غ فراولة',time:'10:00'},{t:'الغداء',name:'كباب كوبيده ورز',detail:'200 غ كباب كوبيده + 120 غ رز مطبوخ + طماطم مشوية + سلطة',time:'14:30'},{t:'سناك',name:'جبن قريش وخيار وتفاح',detail:'200 غ جبن قريش + 100 غ خيار + تفاحة صغيرة',time:'17:30'},{t:'العشاء',name:'هامور مشوي وبطاطا',detail:'250 غ هامور مشوي + 200 غ خضار + 150 غ بطاطا',time:'20:30'}],
[{t:'الفطور',name:'بيض وحلوم قليل الدسم',detail:'بيضتان مسلوقتان + 150 غ بياض بيض + 40 غ جبن حلوم قليل الدسم + 150 غ خيار وطماطم + موزة صغيرة',time:'10:00'},{t:'الغداء',name:'دجاج ومجبوس',detail:'220 غ دجاج بدون جلد + 150 غ رز مجبوس مطبوخ + 30 غ دقوس + سلطة',time:'14:30'},{t:'سناك',name:'زبادي وفراولة ولوز',detail:'200 غ زبادي يوناني + 150 غ فراولة + 15 غ لوز',time:'17:30'},{t:'العشاء',name:'لحم غنم وكوسا',detail:'180 غ لحم غنم قليل الدهون بعد إزالة العظم + 200 غ كوسا مشوية + 100 غ رز مطبوخ',time:'20:30'}],
[{t:'الفطور',name:'صدر دجاج وبيض وفطر',detail:'100 غ صدر دجاج مطبوخ + بيضتان كاملتان + 100 غ بياض بيض + 80 غ فطر + تفاحة صغيرة',time:'10:00'},{t:'الغداء',name:'جوجه كباب ورز زعفران',detail:'230 غ جوجه كباب + 150 غ رز زعفران مطبوخ + طماطم مشوية وسلطة',time:'14:30'},{t:'سناك',name:'تونة وخبز أسمر',detail:'120 غ تونة بالماء بعد التصفية + شريحة خبز أسمر 40 غ + 100 غ خيار',time:'17:30'},{t:'العشاء',name:'سلمون وبروكلي',detail:'200 غ سلمون مشوي + 200 غ بروكلي + 100 غ بطاطا',time:'20:30'}],
[{t:'الفطور',name:'جبن قريش وبيض',detail:'200 غ جبن قريش + بيضتان كاملتان + 40 غ خبز أسمر + 100 غ طماطم + 100 غ فراولة',time:'10:00'},{t:'الغداء',name:'كباب لحم ورز',detail:'220 غ كباب لحم مشوي قليل الدهون + 130 غ رز مطبوخ + سلطة',time:'14:30'},{t:'سناك',name:'زبادي وموز وتمر',detail:'200 غ زبادي يوناني + موزة صغيرة + تمرتان',time:'17:30'},{t:'العشاء',name:'روبيان وبطاطا',detail:'250 غ روبيان + 200 غ خضار + 120 غ بطاطا',time:'20:30'}],
[{t:'الفطور',name:'ستيك وبيض وفيتا',detail:'120 غ ستيك لحم + بيضتان كاملتان + 20 غ جبن فيتا + 100 غ طماطم + 100 غ تفاح',time:'10:00'},{t:'الغداء',name:'لحم عجل ورز زعفران',detail:'200 غ لحم عجل قليل الدهون + 150 غ رز زعفران مطبوخ + خضار مطبوخة',time:'14:30'},{t:'سناك',name:'جبن قريش وفراولة',detail:'200 غ جبن قريش + 150 غ فراولة + 10 غ مكسرات',time:'17:30'},{t:'العشاء',name:'كباب دجاج وحمص',detail:'200 غ كباب دجاج + 40 غ حمص + 200 غ سلطة + 100 غ بطاطا',time:'20:30'}],
[{t:'الفطور',name:'يوم مفتوح مرن',detail:'اختر وجباتك بحرية واعتدال مع الحفاظ على البروتين',time:'10:00'},{t:'الغداء',name:'وجبة حسب اختيارك',detail:'مجبوس أو مشاوي أو وجبة تحبها',time:'14:30'},{t:'سناك',name:'سناك حسب اختيارك',detail:'فواكه أو حلوى بكمية معتدلة',time:'17:30'},{t:'العشاء',name:'عشاء حسب اختيارك',detail:'اختر ما يناسبك بدون تعويض أو تجويع',time:'20:30'}]
];
// Meals are editable examples; exact calories/macros depend on ingredients, preparation, and raw/cooked weights.
const items=[['dashboard','⌂','الرئيسية'],['weight','◉','الوزن'],['food','▤','الغذاء'],['measure','◫','القياسات'],['coach','✧','المدرب'],['settings','⚙','الإعدادات']];let page='dashboard';let selectedDay=state.day;
function nav(){document.getElementById('desktopNav').innerHTML=items.map(([id,ic,n])=>`<button class="${page===id?'active':''}" onclick="go('${id}')">${ic} &nbsp; ${n}</button>`).join('');document.getElementById('mobileNav').innerHTML=items.map(([id,ic,n])=>`<button class="${page===id?'active':''}" onclick="go('${id}')"><span>${ic}</span>${n}</button>`).join('')}
function go(p){page=p;nav();render();window.scrollTo(0,0)}
function cardMetric(label,value,unit,hint){return `<div class="card"><div class="metric-label">${label}</div><div class="metric">${value} <small>${unit}</small></div><div class="hint">${hint}</div></div>`}
function chart(){const data=[...state.weights].sort((a,b)=>a.date.localeCompare(b.date)).slice(-12);if(data.length<2)return `<div class="empty">أضف وزن جديد عشان يطلع لك الرسم البياني للتقدم</div>`;const vals=data.map(x=>+x.weight);const min=Math.min(...vals)-.5,max=Math.max(...vals)+.5;const points=data.map((x,i)=>`${32+(i/(data.length-1))*440},${178-(x.weight-min)/(max-min)*145}`).join(' ');return `<svg class="chart" viewBox="0 0 500 205" preserveAspectRatio="none"><line x1="30" y1="32" x2="480" y2="32"/><line x1="30" y1="105" x2="480" y2="105"/><line x1="30" y1="178" x2="480" y2="178"/><polyline points="${points}"/><text x="30" y="195">${safe(data[0].date)}</text><text x="400" y="195">${safe(data.at(-1).date)}</text></svg>`}
function mealRows(d,checkboxes=false){if(state.openDay===d)return `<div class="empty">هذا اليوم مفتوح ومرن. سجّل وجباتك المعتادة وراعِ الشبع والبروتين بدون تشدد.</div>`;return days[d-1].map((m,i)=>`<div class="meal"><div><strong>${safe(m.name)}</strong><small>${safe(m.t)} · ${safe(m.time)}<br>${safe(m.detail)}</small></div>${checkboxes?`<label class="checkline"><input type="checkbox" ${state.done[d+'-'+i]?'checked':''} onchange="toggleMeal(${d},${i},this.checked)"> تم</label>`:`<span class="pill">${safe(m.t)}</span>`}</div>`).join('')}
function dashboard(){const w=latest()?.weight||99.4;const done=days[state.day-1].filter((_,i)=>state.done[state.day+'-'+i]).length;return `<section class="hero"><div><div class="tag">✦ رحلتك مستمرة</div><h2>هلا فيك، جاهز ليوم أقوى؟</h2><p>كل تسجيل صغير يقربك من هدفك.<br>اليوم ${state.day} من برنامجك الغذائي المتسلسل.</p></div><div class="round"><div><b>${state.day}/7</b>اليوم</div></div></section><div class="grid">${cardMetric('آخر وزن',fmt(w),'كجم','آخر تسجيل: '+safe(latest()?.date||'—'))}${cardMetric('الوزن المستهدف',fmt(state.profile.goalWeight),'كجم','تقدر تعدله بالإعدادات')}${cardMetric('التمارين',state.profile.trainingDays,'أيام/أسبوع','مقاومة + كارديو')}</div><div class="two" style="margin-top:18px"><div class="card"><div class="rowbetween"><h3>وجبات اليوم ${state.day}</h3><button class="button secondary" onclick="go('food')">الجدول كامل</button></div>${mealRows(state.day,true)}<div class="progress"><span style="width:${done*25}%"></span></div><div class="hint" style="margin-top:9px">أنجزت ${done} من 4 وجبات</div></div><div class="stack"><div class="card"><h3>تطور وزنك</h3>${chart()}<button class="button secondary" onclick="go('weight')">سجّل وزن اليوم</button></div><div class="card"><h3>هدفك اليومي المبدئي</h3><div class="rowbetween"><span>السعرات</span><b>${state.profile.calories} سعرة</b></div><div class="progress"><span style="width:65%"></span></div><p class="hint">هدف تخطيطي، مو استهلاك فعلي محسوب.</p><div class="rowbetween"><span>البروتين</span><b>${state.profile.protein} غ</b></div></div></div></div>`}
function weightPage(){const arr=[...state.weights].sort((a,b)=>b.date.localeCompare(a.date));return `<div class="two"><div class="card"><h3>سجّل وزنك</h3><form onsubmit="addWeight(event)" class="formGrid"><div class="field"><label>التاريخ</label><input name="date" type="date" required value="${dateNow()}"></div><div class="field"><label>الوزن (كجم)</label><input name="weight" type="number" min="30" max="350" step="0.1" placeholder="99.4" required></div><div class="full"><button class="button">حفظ الوزن</button></div></form><p class="hint">الأفضل تقيس الصبح بعد الحمام وقبل الفطور وبنفس الميزان.</p></div><div class="card"><h3>منحنى الوزن</h3>${chart()}</div></div><div class="sectionHead"><h2>سجل الوزن</h2></div><div class="card"><table class="weightList"><thead><tr><th>التاريخ</th><th>الوزن</th><th></th></tr></thead><tbody>${arr.map(x=>`<tr><td>${safe(x.date)}</td><td>${fmt(x.weight)} كجم</td><td><button class="button ghost" onclick="deleteWeight('${safe(x.date)}')">حذف</button></td></tr>`).join('')}</tbody></table></div>`}
function foodPage(){return `<div class="card"><div class="rowbetween"><div><h3>برنامجك الغذائي المرن</h3><p class="subtle">أيام متسلسلة، مو مرتبطة بأيام الأسبوع. اضغط على أي يوم لعرض وجباته.</p></div><span class="tag">اليوم الحالي ${state.day}</span></div><div class="daytabs">${days.map((_,i)=>`<button class="${selectedDay===i+1?'active':''}" onclick="selectDay(${i+1})">اليوم ${i+1}${state.openDay===i+1?' ★':''}</button>`).join('')}</div><div class="sectionHead"><h2>وجبات اليوم ${selectedDay}</h2><button class="button ghost" onclick="openDay(${selectedDay})">${state.openDay===selectedDay?'إلغاء اليوم المفتوح':'اجعله اليوم المفتوح'}</button></div>${mealRows(selectedDay,true)}<div class="flex" style="margin-top:18px"><button class="button" onclick="advanceDay()">انتقل لليوم التالي ←</button><button class="button secondary" onclick="setCurrentDay(${selectedDay})">اعتمد هذا اليوم كالحالي</button></div></div><p class="notice" style="margin-top:14px">الوجبات من جدولك المصوّر. الأوزان المذكورة للدجاج واللحوم والأسماك والرز والبطاطا بعد الطبخ؛ الزيت بالغرام. السعرات والبروتين اليوميان في الإعدادات أهداف تقديرية وليسا حساباً مؤكداً لهذه الوجبات. اختر اليوم المفتوح بأي يوم يناسبك.</p>`}
function measuresPage(){const arr=[...state.measurements].sort((a,b)=>b.date.localeCompare(a.date));return `<div class="two"><div class="card"><h3>أضف قياسات الجسم</h3><form onsubmit="addMeasures(event)" class="formGrid"><div class="field full"><label>التاريخ</label><input type="date" name="date" required value="${dateNow()}"></div>${[['waist','محيط البطن'],['chest','الصدر'],['hips','الحوض'],['arm','الذراع'],['thigh','الفخذ']].map(([n,l])=>`<div class="field"><label>${l} (سم)</label><input type="number" step="0.1" min="1" max="250" name="${n}" placeholder="اختياري"></div>`).join('')}<div class="full"><button class="button">حفظ القياسات</button></div></form></div><div class="card"><h3>آخر القياسات</h3>${arr.length?Object.entries(arr[0]).filter(([k])=>k!=='date').map(([k,v])=>`<div class="meal"><strong>${({waist:'البطن',chest:'الصدر',hips:'الحوض',arm:'الذراع',thigh:'الفخذ'})[k]}</strong><b>${fmt(v)} سم</b></div>`).join(''):'<div class="empty">ما سجلت قياسات للحين</div>'}</div></div><div class="sectionHead"><h2>سجل القياسات</h2></div><div class="card">${arr.length?arr.map(x=>`<div class="meal"><div><strong>${safe(x.date)}</strong><small>${Object.entries(x).filter(([k])=>k!=='date').map(([k,v])=>`${({waist:'البطن',chest:'الصدر',hips:'الحوض',arm:'الذراع',thigh:'الفخذ'})[k]}: ${fmt(v)} سم`).join(' · ')}</small></div><button class="button ghost" onclick="deleteMeasure('${safe(x.date)}')">حذف</button></div>`).join(''):'<div class="empty">سجّل قياساتك الأولى</div>'}</div>`}
function coachPage(){return `<div class="card"><div class="rowbetween"><div><h3>اسأل مدربك الذكي ✧</h3><p class="subtle">يراعي بياناتك ووزنك المسجل وجدولك الغذائي.</p></div><div class="field"><select id="provider" onchange="setProvider(this.value)"><option value="claude" ${state.provider==='claude'?'selected':''}>Claude</option><option value="chatgpt" ${state.provider==='chatgpt'?'selected':''}>ChatGPT</option></select></div></div><div class="chatlog" id="chatlog">${state.chat.length?state.chat.map(x=>`<div class="bubble ${x.role==='user'?'user':'bot'}">${safe(x.text)}</div>`).join(''):'<div class="empty">مثال: شنو أكل بعد تمرين الصبح؟ أو عدّل وجباتي حسب آخر وزن.</div>'}</div><form class="chatrow" onsubmit="askCoach(event)"><input name="message" required maxlength="5000" placeholder="اكتب سؤالك للمدرب..." autocomplete="off"><button id="sendBtn" class="button">إرسال</button></form><p class="notice" style="margin-top:15px">لتفعيل المحادثة الحقيقية، شغّل السيرفر بمفاتيح Claude وOpenAI في متغيرات البيئة. اشتراك ChatGPT أو Claude الشخصي لا يشمل بالضرورة استخدام API، وقد تكون عليه تكلفة منفصلة. بياناتك المرسلة للمحادثة تُرسل إلى مزوّد الذكاء الاصطناعي المختار.</p></div>`}
function settingsPage(){const p=state.profile;return `<div class="two"><div class="card"><h3>الملف الشخصي والأهداف</h3><form class="formGrid" onsubmit="saveSettings(event)">${[['age','العمر','سنة'],['height','الطول','سم'],['goalWeight','الوزن المستهدف','كجم'],['calories','هدف السعرات اليومي','سعرة'],['protein','هدف البروتين اليومي','غ'],['trainingDays','أيام النادي أسبوعياً','يوم']].map(([n,l,u])=>`<div class="field"><label>${l} (${u})</label><input name="${n}" type="number" step="${n==='goalWeight'?'0.1':'1'}" min="1" value="${p[n]}" required></div>`).join('')}<div class="field"><label>وقت النادي</label><input name="trainingTime" type="time" value="${p.trainingTime}"></div><div class="field"><label>وقت أول وجبة</label><input name="firstMeal" type="time" value="${p.firstMeal}"></div><div class="full"><button class="button">حفظ الإعدادات</button></div></form></div><div class="stack"><div class="card"><h3>تفضيلاتك المحفوظة</h3><p class="subtle">كويتي وإيراني ومشاوي وستيك. بدون أكل هندي أو واي بروتين أو حليب سادة. فواكه مفضلة: تمر، موز، فراولة، تفاح. يوم مفتوح مرن.
</div>
<div class="card">
  <h3>نقل القياسات القديمة</h3>
  <p class="subtle">
    نقل القياسات المحفوظة على هذا الجهاز إلى Supabase
  </p>
  
<button type="button" class="button secondary" onclick="migrateOldMeasurements()">نقل القياسات إلى السحابة</button>

</div>
<div class="card"><h3>نسخة احتياطية</h3>
<p class="subtle">بيانات النسخة الحالية محفوظة في متصفح هذا الجهاز فقط، وما تتزامن تلقائياً بين الأجهزة. تقدر تنقلها بملف.</p><div class="flex"><button class="button secondary" onclick="exportData()">تصدير البيانات</button><label class="button ghost" style="cursor:pointer">استيراد ملف <input type="file" accept="application/json" hidden onchange="importData(event)"></label></div></div><div class="card"><h3>الخصوصية والتنبيهات</h3><p class="subtle">التنبيهات الآلية والمزامنة السحابية وتسجيل الدخول ليست مفعّلة في هذه النسخة الأولية. يفضّل تشغيلها على استضافة آمنة HTTPS قبل الاستخدام على أكثر من جهاز.</p></div></div></div>`}
function render(){document.getElementById('todayLabel').textContent=new Date().toLocaleDateString('ar-KW',{weekday:'long',day:'numeric',month:'long',year:'numeric'});document.getElementById('pageTitle').textContent=items.find(x=>x[0]===page)[2];document.getElementById('view').innerHTML=({dashboard,weight:weightPage,food:foodPage,measure:measuresPage,coach:coachPage,settings:settingsPage})[page]();if(page==='coach'){let el=document.getElementById('chatlog');el.scrollTop=el.scrollHeight}}

async function addWeight(e) {
  e.preventDefault();

  const form = e.target;
  const f = new FormData(form);
  const date = f.get("date");
  const weight = Number(f.get("weight"));

  if (!Number.isFinite(weight) || weight < 30 || weight > 350) {
    alert("تأكد من الوزن");
    return;
  }

  const { data: { user }, error: authError } =
    await supabaseClient.auth.getUser();

  if (authError || !user) {
    alert("سجّل الدخول أولاً");
    return;
  }

  const { data: existing, error: lookupError } =
    await supabaseClient
      .from("weight_logs")
      .select("id")
      .eq("user_id", user.id)
      .eq("log_date", date)
      .limit(1);

  if (lookupError) {
    alert("تعذر فحص الوزن: " + lookupError.message);
    return;
  }

  const record = {
    user_id: user.id,
    log_date: date,
    weight_kg: weight
  };

  let result;

  if (existing.length > 0) {
    result = await supabaseClient
      .from("weight_logs")
      .update({ weight_kg: weight })
      .eq("id", existing[0].id)
      .eq("user_id", user.id)
      .select();
  } else {
    result = await supabaseClient
      .from("weight_logs")
      .insert(record)
      .select();
  }

  if (result.error || !result.data?.length) {
    alert(
      "تعذر حفظ الوزن: " +
      (result.error?.message || "لم يتم تأكيد الحفظ")
    );
    return;
  }

  state.weights = state.weights.filter(
    x => x.date !== date
  );

  state.weights.push({ date, weight });
  save();
  render();

  alert("تم حفظ الوزن في Supabase بنجاح");
}

function deleteWeight(date){if(!confirm('تحذف تسجيل الوزن؟'))return;state.weights=state.weights.filter(x=>x.date!==date);save();render()}
function addMeasures(e){e.preventDefault();const f=new FormData(e.target),obj={date:f.get('date')};for(const k of ['waist','chest','hips','arm','thigh'])if(f.get(k)!==''){const n=Number(f.get(k));if(n<=0||n>250)return alert('تأكد من القياسات');obj[k]=n}if(Object.keys(obj).length===1)return alert('أدخل قياس واحد على الأقل');state.measurements=state.measurements.filter(x=>x.date!==obj.date);state.measurements.push(obj);save();render()}
function deleteMeasure(date){if(!confirm('تحذف القياسات؟'))return;state.measurements=state.measurements.filter(x=>x.date!==date);save();render()}
function toggleMeal(d,i,v){state.done[d+'-'+i]=v;save();render()}
function selectDay(d){selectedDay=d;render()}function openDay(d){state.openDay=state.openDay===d?null:d;save();render()}function setCurrentDay(d){state.day=d;save();render()}function advanceDay(){state.day=state.day===7?1:state.day+1;selectedDay=state.day;save();render()}
function setProvider(p){state.provider=p;save()}
async function askCoach(e){e.preventDefault();const input=e.target.elements.message;const message=input.value.trim();if(!message)return;state.chat.push({role:'user',text:message});input.value='';save();render();const btn=document.getElementById('sendBtn');btn.disabled=true;btn.textContent='...';try{const r=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({provider:state.provider,message,context:{profile:state.profile,weights:state.weights.slice(-30),measurements:state.measurements.slice(-10),day:state.day,openDay:state.openDay,meals:days[state.day-1],done:state.done}})});const j=await r.json();state.chat.push({role:'bot',text:j.reply||'تعذر الاتصال: '+(j.error||'خطأ غير معروف')})}catch{state.chat.push({role:'bot',text:'تعذر الوصول إلى السيرفر. شغّل التطبيق من خلال Node.js، مو بفتح ملف HTML مباشرة.'})}save();render()}
function saveSettings(e){e.preventDefault();const f=new FormData(e.target);for(const k of ['age','height','goalWeight','calories','protein','trainingDays'])state.profile[k]=Number(f.get(k));for(const k of ['trainingTime','firstMeal'])state.profile[k]=f.get(k);save();render();alert('تم حفظ إعداداتك')}
function exportData(){const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='my-nutrition-coach-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),500)}
async function importData(e){const file=e.target.files?.[0];if(!file)return;try{const obj=JSON.parse(await file.text());if(!obj.profile||!Array.isArray(obj.weights)||!Array.isArray(obj.measurements))throw Error();if(!confirm('استيراد الملف يستبدل البيانات الحالية. تبي تكمل؟'))return;state={...initial,...obj};save();render()}catch{alert('ملف النسخة الاحتياطية غير صالح')}}


const SUPABASE_URL = "https://xitctlzolmylyprzttur.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_NxDgXdO5AnzLl_0hH5MG4g_C4kyDRg_";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

async function signUp(email, password) {
  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password
  });

  if (error) {
    alert("خطأ في إنشاء الحساب: " + error.message);
    return;
  }

  alert("تم إرسال رسالة تأكيد إلى بريدك الإلكتروني إذا كان التأكيد مطلوباً.");
}

async function signIn(email, password) {
  const { error } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    alert("خطأ في تسجيل الدخول: " + error.message);
    return;
  }

  alert("تم تسجيل الدخول بنجاح");
}

async function signOut() {
  const { error } = await supabaseClient.auth.signOut();

  if (error) {
    alert("تعذر تسجيل الخروج: " + error.message);
    return;
  }

  alert("تم تسجيل الخروج");
}

function showLogin() {
  document.getElementById("view").innerHTML = `
    <div class="card" style="max-width:420px;margin:40px auto">
      <h2>تسجيل الدخول</h2>
      <p>سجّل دخولك لمزامنة بياناتك بين أجهزتك.</p>

      <form id="loginForm" class="formGrid">
        <div class="field full">
          <label>البريد الإلكتروني</label>
          <input type="email" name="email" required>
        </div>

        <div class="field full">
          <label>كلمة المرور</label>
          <input type="password" name="password"
                 minlength="6" required>
        </div>

        <div class="full flex">
          <button class="button" type="submit">
            تسجيل الدخول
          </button>
          <button class="button secondary"
                  type="button" id="signupBtn">
            إنشاء حساب
          </button>
        </div>
      </form>
    </div>
  `;

  const form = document.getElementById("loginForm");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = new FormData(form);
    await signIn(data.get("email"), data.get("password"));
  });

  document.getElementById("signupBtn").onclick = async () => {
    const data = new FormData(form);
    if (!form.reportValidity()) return;
    await signUp(data.get("email"), data.get("password"));
  };
}


async function startAuth() {
  const { data, error } =
    await supabaseClient.auth.getUser();

  if (error && error.name !== "AuthSessionMissingError") {
    console.error("Auth error:", error.message);
  }

  if (data?.user) {
    await loadCloudWeights(data.user.id);
    nav();
    render();
  } else {
    showLogin();
  }
}



supabaseClient.auth.onAuthStateChange((event, session) => {
  if (event === "SIGNED_OUT") {
    showLogin();
    return;
  }

  if (event === "SIGNED_IN" && session?.user) {
    // نؤجل تحميل البيانات إلى خارج حدث المصادقة
    setTimeout(async () => {
      await loadCloudWeights(session.user.id);
      nav();
      render();
    }, 0);
  }
});

startAuth();

async function loadCloudWeights(userId) {
  const { data, error } = await supabaseClient
    .from("weight_logs")
    .select("log_date, weight_kg")
    .eq("user_id", userId)
    .order("log_date", { ascending: true });

  if (error) {
    console.error("Weight sync error:", error.message);
    alert("تعذر تحميل الأوزان من السحابة");
    return;
  }

  const cloudWeights = data.map(row => ({
    date: row.log_date,
    weight: Number(row.weight_kg)
  }));

  // الاحتفاظ بالسجلات المحلية القديمة
  const merged = new Map(
    state.weights.map(item => [item.date, item])
  );

  // عند تكرار التاريخ نعتمد نسخة Supabase
  cloudWeights.forEach(item => {
    merged.set(item.date, item);
  });

  state.weights = [...merged.values()].sort(
    (a, b) => a.date.localeCompare(b.date)
  );

  save();
}
async function migrateOldMeasurements() {
  const { data: { user }, error: authError } =
    await supabaseClient.auth.getUser();
  if (authError || !user) {
    alert("سجّل الدخول أولاً");
    return;
  }

  const oldMeasurements = state.measurements || [];

  if (!oldMeasurements.length) {
    alert("ما فيه قياسات محلية للنقل");
    return;
  }

  const { data: cloudRows, error: readError } =
    await supabaseClient
      .from("body_measurements")
      .select("log_date")
      .eq("user_id", user.id);

  if (readError) {
    alert("تعذر فحص القياسات: " + readError.message);
    return;
  }

  const existingDates = new Set(
    cloudRows.map(row => row.log_date)
  );

  const rows = oldMeasurements
    .filter(item => !existingDates.has(item.date))
    .map(item => ({
      user_id: user.id,
      log_date: item.date,
      waist_cm: item.waist ?? null,
      chest_cm: item.chest ?? null,
      hip_cm: item.hips ?? null,
      arm_cm: item.arm ?? null,
      thigh_cm: item.thigh ?? null
    }));

  if (!rows.length) {
    alert("كل تواريخ القياسات موجودة بالسحابة مسبقاً");
    return;
  }

  const { data, error } = await supabaseClient
    .from("body_measurements")
    .insert(rows)
    .select("id");

  if (error) {
    alert("فشل نقل القياسات: " + error.message);
    return;
  }

  alert("تم نقل " + data.length + " سجل قياسات بنجاح");
}

  
async function loadCloudMeasurements(userId) {
  const { data, error } = await supabaseClient
    .from("body_measurements")
    .select("log_date, waist_cm, chest_cm, hip_cm, arm_cm, thigh_cm")
    .eq("user_id", userId)
    .order("log_date", { ascending: true });

  if (error) {
    console.error("Measurements sync error:", error.message);
    alert("تعذر تحميل القياسات من السحابة");
    return;
  }

  const cloudMeasurements = data.map(row => {
    const item = { date: row.log_date };

    const fields = {
      waist: row.waist_cm,
      chest: row.chest_cm,
      hips: row.hip_cm,
      arm: row.arm_cm,
      thigh: row.thigh_cm
    };

    for (const [key, value] of Object.entries(fields)) {
      if (value !== null && value !== undefined) {
        item[key] = Number(value);
      }
    }

    return item;
  });

  const merged = new Map(
    state.measurements.map(item => [item.date, item])
  );

  cloudMeasurements.forEach(item => {
    merged.set(item.date, item);
  });

  state.measurements = [...merged.values()].sort(
    (a, b) => a.date.localeCompare(b.date)
  );

  save();
}

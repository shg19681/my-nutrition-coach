/* Session records share the existing per-user coach_settings cloud row. */
const muscleGroups=['صدر','ظهر','أرجل','أكتاف','باي','تراي','بطن','لياقة'];
let trainingDate=null, trainingPhoto='', trainingBusy=false;
function sessionFor(date){return state.training?.[date] || {status:'unlogged',groups:[],exercises:[],minutes:0,cardio:0,pain:false};}
function trainingSummary(s){
 const volume=s.exercises.reduce((n,x)=>n+x.weight*x.reps*x.sets,0);
 const sets=s.exercises.reduce((n,x)=>n+x.sets,0);
 const weight=Number(s.bodyWeight);
 const energy=weight>0 && s.minutes>0 ? [3.5,6].map(m=>Math.round(m*3.5*weight/200*s.minutes)) : null;
 return {volume,sets,energy};
}
function trainingPage(){
 const date=trainingDate||dateNow(),s=sessionFor(date),a=trainingSummary(s);
 return `<div class="card"><h3>تمرين اليوم</h3><div class="field"><label for="trainingDate">التاريخ</label><input id="trainingDate" type="date" value="${safe(date)}" onchange="trainingDate=this.value;render()"></div><div class="flex" style="margin:16px 0"><button class="button ${s.status==='trained'?'':'secondary'}" onclick="setTrainingStatus('trained')">تمرنت</button><button class="button ${s.status==='rest'?'':'secondary'}" onclick="setTrainingStatus('rest')">راحة</button><span class="hint">${s.status==='unlogged'?'لم تسجّل حالة هذا اليوم':s.status==='rest'?'يوم راحة':'يوم تمرين'}</span></div>${s.status==='trained'?`
 <form class="formGrid" onsubmit="saveTrainingDetails(event)"><fieldset class="full musclePicker"><legend>اختر كل الأقسام التي تمرنتها</legend>${muscleGroups.map(g=>`<label class="checkline"><input type="checkbox" name="group" value="${g}" ${s.groups.includes(g)?'checked':''}>${g}</label>`).join('')}</fieldset><div class="field"><label for="resistanceMinutes">مدة المقاومة بالدقائق، تشمل الراحة بين الجولات</label><input id="resistanceMinutes" name="minutes" type="number" min="0" max="300" value="${s.minutes||0}" required></div><div class="field"><label for="cardioMinutes">مدة الكارديو بالدقائق، منفصلة</label><input id="cardioMinutes" name="cardio" type="number" min="0" max="300" value="${s.cardio||0}" required></div><label class="checkline full"><input type="checkbox" name="pain" ${s.pain?'checked':''}>يوجد ألم أثناء التمرين، خصوصاً الكتف</label><button class="button full">حفظ تفاصيل الجلسة</button></form>
 <div class="sectionHead"><h2>أضف تمريناً أو مجموعة جولات</h2></div><form id="exerciseForm" class="formGrid" onsubmit="addExercise(event)"><div class="field full"><label for="exerciseName">اسم الجهاز أو التمرين</label><input id="exerciseName" name="name" maxlength="100" required placeholder="مثال: ضغط صدر بالجهاز"></div><div class="field"><label for="exerciseGroup">القسم الأساسي للتمرين</label><select name="group" id="exerciseGroup">${muscleGroups.map(g=>`<option>${g}</option>`).join('')}</select></div><div class="field"><label for="exerciseWeight">الوزن الكلي المستخدم (كجم)، صفر لوزن الجسم</label><input id="exerciseWeight" name="weight" type="number" min="0" max="1000" step="0.5" required></div><div class="field"><label for="exerciseSets">الجولات بنفس الوزن والتكرارات</label><input id="exerciseSets" name="sets" type="number" min="1" max="30" value="3" required></div><div class="field"><label for="exerciseReps">التكرارات لكل جولة</label><input id="exerciseReps" name="reps" type="number" min="1" max="200" value="10" required></div><div class="field full"><label for="exercisePhoto">صورة الجهاز (اختيارية)</label><input id="exercisePhoto" type="file" accept="image/jpeg,image/png,image/webp" onchange="prepareTrainingPhoto(this)"><div id="photoStatus" class="hint"></div><img id="photoPreview" class="exercisePhoto" alt="معاينة صورة الجهاز" hidden></div><p class="hint full">إذا تغيّر الوزن أو التكرارات بين الجولات، أضف مجموعة جديدة بنفس اسم التمرين. الصورة تُحفظ مع السجل؛ ارجع لمحادثتك مع ChatGPT واطلب مراجعة التطبيق والصور بعد الحفظ.</p><button id="exerciseSave" class="button full">إضافة التمرين</button></form>
 </div><div class="card" style="margin-top:16px"><h3>ملخص الجلسة</h3><button class="button secondary" onclick="copyCoachSummary(true)">نسخ الجلسة لـChatGPT</button><p class="hint">انسخ الجلسة والصقها في محادثتك، أو اطلب من المساعد فتح التطبيق ومراجعتها. أرفق الصور في المحادثة عند الحاجة.</p><div id="copyStatus" class="subtle" style="white-space:pre-wrap"></div><p>${fmt(s.exercises.length)} مجموعات تمارين مسجلة • ${fmt(a.sets)} جولة • حجم الأوزان ${fmt(a.volume)} كجم</p>${s.bodyWeight?`<p class="hint">الوزن المستخدم للتقدير: ${fmt(s.bodyWeight)} كجم، آخر وزن مسجل حتى هذا التاريخ.</p>`:''}<p>${a.energy?`طاقة المقاومة التقديرية: ${fmt(a.energy[0])} - ${fmt(a.energy[1])} سعرة إجمالية تشمل طاقة الراحة.`:'سجّل مدة المقاومة ووزناً بتاريخ الجلسة أو قبلها لإظهار تقدير الطاقة.'}</p><p class="hint">هذا نطاق تقريبي واسع حسب شدة الجلسة، وليس قياساً فعلياً ولا توصية بزيادة الأكل. لا يشمل الكارديو. حجم الأوزان لا يساوي سعرات، ولا يحسب وزن الجسم في تمارين وزن الجسم. <a href="https://pacompendium.com/conditioning-exercise/" target="_blank" rel="noopener">مرجع تقدير النشاط</a></p>${s.pain?'<p class="notice">سجّلت ألماً. أوقف الحركة المؤلمة ولا تزد الحمل عليها. راجع مختصاً لتقييم ألم الكتف قبل اقتراح تمارين له.</p>':''}${s.exercises.map((x,i)=>exerciseCard(x,i,date)).join('')||'<div class="empty">أضف أول تمرين للجلسة</div>'}</div>`:'</div>'}
 <div class="card" style="margin-top:16px"><h3>سجل التمرين والراحة</h3>${Object.entries(state.training||{}).sort(([a],[b])=>b.localeCompare(a)).map(([d,x])=>`<div class="meal"><span>${safe(d)} • ${x.status==='rest'?'راحة':'تمرين'} • ${safe(x.groups.join('، '))}</span><button class="button ghost" onclick="trainingDate='${safe(d)}';go('training')">عرض</button></div>`).join('')||'<div class="empty">ما سجلت أيام للحين</div>'}</div>`;
}
function exerciseCard(x,i,date){
 const prev=Object.entries(state.training||{}).filter(([d])=>d<date).sort(([a],[b])=>b.localeCompare(a)).flatMap(([,s])=>s.exercises).find(e=>e.name.trim()===x.name.trim()&&e.group===x.group);
 return `<div class="meal"><div><strong>${safe(x.name)} • ${safe(x.group)}</strong><small>${fmt(x.weight)} كجم × ${fmt(x.reps)} تكرار × ${fmt(x.sets)} جولة${prev?`<br>آخر تسجيل سابق: ${fmt(prev.weight)} كجم × ${fmt(prev.reps)} × ${fmt(prev.sets)}؛ المقارنة تتطلب نفس الجهاز والطريقة.`:''}</small>${/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(x.photo||'')?`<img class="exercisePhoto" alt="صورة الجهاز المسجلة" src="${x.photo}">`:''}<a href="https://www.youtube.com/results?search_query=${encodeURIComponent(x.name+' شرح الأداء الصحيح')}" target="_blank" rel="noopener">ابحث عن شرح فيديو للتمرين</a><small>نتائج بحث، وليست فيديوهات مختارة أو مراجعة من المدرب.</small></div><button class="button ghost" onclick="deleteExercise(${i})">حذف</button></div>`;
}
async function persistTraining(){
 try{save();}catch{alert('مساحة الجهاز ممتلئة. احذف صورة غير لازمة أو صدّر نسخة احتياطية. لم يكتمل الحفظ.');return false;}
 return await saveCloudSettings();
}
async function setTrainingStatus(status){
 const date=trainingDate||dateNow(),old=sessionFor(date);
 if(status==='rest' && old.exercises.length && !confirm('تحويل اليوم إلى راحة يحذف تمارين هذا اليوم. تبي تكمل؟'))return;
 state.training||={};state.training[date]=status==='rest'?{status,groups:[],exercises:[],minutes:0,cardio:0,pain:false}:{...old,status};
 await persistTraining();render();
}
async function saveTrainingDetails(e){
 e.preventDefault();const f=new FormData(e.target),date=trainingDate||dateNow();const s=sessionFor(date);
 const groups=f.getAll('group');for(const x of s.exercises)if(!groups.includes(x.group))groups.push(x.group);
 const weight=[...state.weights].filter(w=>w.date<=date).sort((a,b)=>b.date.localeCompare(a.date))[0]?.weight;
 state.training[date]={...s,groups,minutes:Number(f.get('minutes')),cardio:Number(f.get('cardio')),pain:f.has('pain'),bodyWeight:weight||null};
 await persistTraining();render();
}
async function prepareTrainingPhoto(input){
 const file=input.files?.[0];trainingPhoto='';if(!file)return;
 const status=document.getElementById('photoStatus'),preview=document.getElementById('photoPreview');preview.hidden=true;
 const btn=document.getElementById('exerciseSave');btn.disabled=true;trainingBusy=true;
 try{
  if(file.size>15*1024*1024)throw Error('اختر صورة أصغر من 15 ميجابايت');
  const bitmap=await createImageBitmap(file),scale=Math.min(1,640/Math.max(bitmap.width,bitmap.height));
  const canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
  trainingPhoto=canvas.toDataURL('image/jpeg',0.65);
  if(trainingPhoto.length>180000)throw Error('الصورة كبيرة بعد التصغير، اختر صورة أبسط');
  preview.src=trainingPhoto;preview.hidden=false;status.textContent='الصورة جاهزة للحفظ';
 }catch(err){trainingPhoto='';status.textContent=err.message||'تعذر قراءة الصورة؛ جرّب صورة أخرى';}
 finally{trainingBusy=false;btn.disabled=false;}
}
async function addExercise(e){
 e.preventDefault();if(trainingBusy)return;
 const f=new FormData(e.target),date=trainingDate||dateNow(),s=sessionFor(date);
 const x={name:String(f.get('name')).trim(),group:String(f.get('group')),weight:Number(f.get('weight')),sets:Number(f.get('sets')),reps:Number(f.get('reps')),photo:trainingPhoto};
 if(!x.name||!muscleGroups.includes(x.group)||!Number.isFinite(x.weight)||x.weight<0||x.weight>1000||!Number.isInteger(x.sets)||x.sets<1||x.sets>30||!Number.isInteger(x.reps)||x.reps<1||x.reps>200)return alert('راجع اسم التمرين والأوزان والجولات والتكرارات');
 const photoBytes=JSON.stringify(state.training||{}).length+x.photo.length;
 if(photoBytes>2500000)return alert('سجل الصور وصل للحد المتاح؛ أضف التمرين دون صورة أو احذف صورة قديمة بعد تصدير نسخة احتياطية.');
 s.exercises.push(x);s.status='trained';if(!s.groups.includes(x.group))s.groups.push(x.group);state.training||={};state.training[date]=s;
 trainingPhoto='';await persistTraining();render();
}
async function deleteExercise(i){if(!confirm('حذف مجموعة الجولات هذه؟'))return;sessionFor(trainingDate||dateNow()).exercises.splice(i,1);await persistTraining();render();}
function chefMessage(){
 const d=state.openDay,ar=d?`اليوم ${d} من الجدول يوم مفتوح كامل. لا تحضّر وجبات النظام لهذا اليوم إلا بطلب منفصل.`:'تم إلغاء اختيار اليوم المفتوح. يرجى مراجعة صاحب الجدول قبل تحضير وجبات اليوم السابع.';
 const en=d?`Day ${d} of the plan is a full open day. Do not prepare diet meals for this day unless separately requested.`:'The open-day selection has been cancelled. Please confirm day-seven meals with the plan owner.';
 return `${ar}\n\n${en}`;
}
function chefSharePanel(){return `<div class="card" style="margin-top:16px"><h3>إبلاغ الطباخ باليوم المفتوح</h3><p style="white-space:pre-wrap">${safe(chefMessage())}</p><a class="button" href="https://wa.me/?text=${encodeURIComponent(chefMessage())}" target="_blank" rel="noopener">فتح واتساب برسالة جاهزة</a><p class="hint">اختر محادثة الطباخ وراجع الرسالة ثم أرسلها بنفسك. لا يتم إرسال شيء تلقائياً.</p></div>`;}

function coachSummary(sessionOnly=false){
 const date=trainingDate||dateNow();
 const sessions=sessionOnly?[[date,sessionFor(date)]]:Object.entries(state.training||{}).sort(([a],[b])=>b.localeCompare(a)).slice(0,14);
 const lines=['راجع بياناتي التالية وقدّم ملاحظاتك بالعربية. أي تعديل على الجدول يحتاج موافقتي.'];
 if(!sessionOnly){lines.push('أهدافي: '+JSON.stringify(state.profile),'آخر الأوزان: '+JSON.stringify([...state.weights].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,10)),'آخر القياسات: '+JSON.stringify([...state.measurements].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5)),'اليوم الحالي من البرنامج: '+state.day+'؛ اليوم المفتوح: '+(state.openDay||'لم يحدد'));}
 for(const [d,s] of sessions){lines.push('التاريخ: '+d+' | '+(s.status==='rest'?'راحة':'تمرين')+' | الأقسام: '+s.groups.join('، '),'مدة المقاومة: '+s.minutes+' دقيقة؛ الكارديو: '+s.cardio+' دقيقة؛ ألم: '+(s.pain?'نعم':'لا'));for(const x of s.exercises)lines.push(x.name+' ('+x.group+'): '+x.weight+' كجم × '+x.reps+' تكرار × '+x.sets+' جولة'+(x.photo?'؛ توجد صورة محفوظة':''));}
 return lines.join('\n');
}
async function copyCoachSummary(sessionOnly=false){
 const text=coachSummary(sessionOnly),status=document.getElementById('copyStatus');
 try{await navigator.clipboard.writeText(text);status.textContent='تم النسخ. الصق الملخص في محادثتك مع ChatGPT.';}catch{status.textContent='تعذر النسخ التلقائي. انسخ النص التالي يدوياً.';let box=document.getElementById('manualSummary');if(!box){box=document.createElement('textarea');box.id='manualSummary';box.readOnly=true;box.style.width='100%';status.after(box);}box.value=text;box.focus();box.select();}
}

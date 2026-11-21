/* Session records share the existing per-user coach_settings cloud row. */

const exerciseOptionsByGroup={
 'صدر':[['ضغط صدر','جهاز ضغط الصدر'],['بنش برس','بار'],['ضغط صدر مائل','دامبل'],['تفتيح صدر','جهاز بيك ديك'],['كروس أوفر','كيبل']],
 'ظهر':[['سحب أمامي','جهاز السحب العلوي'],['تجديف جالس','كيبل'],['تجديف مسنود الصدر','جهاز تجديف مسنود الصدر'],['تجديف يد واحدة','دامبل']],
 'أرجل':[['ضغط الأرجل','جهاز ضغط الأرجل'],['سكوات','بار'],['هاك سكوات','جهاز هاك سكوات'],['تمديد الركبة','جهاز ليج إكستنشن'],['ثني الركبة','جهاز ليج كيرل'],['رفع السمانة','جهاز السمانة']],
 'أكتاف':[['ضغط كتف','جهاز ضغط الكتف'],['رفع جانبي','دامبل'],['رفرفة خلفية','جهاز بيك ديك عكسي'],['سحب للوجه','كيبل']],
 'باي':[['ثني باي','دامبل'],['باي بريتشر','جهاز بريتشر'],['باي كيبل','كيبل']],
 'تراي':[['دفع تراي للأسفل','كيبل'],['تمديد تراي فوق الرأس','دامبل'],['غطس تراي','جهاز غطس مساعد']],
 'بطن':[['كرنش','جهاز البطن'],['بلانك','وزن الجسم'],['ديد بق','بساط']],
 'لياقة':[['مشي','سير'],['دراجة','دراجة ثابتة'],['تجديف كارديو','جهاز تجديف'],['إليبتكال','جهاز إليبتكال']],
};
function exerciseChoiceOptions(group, field){
 const saved=Object.values(state.training||{}).flatMap(s=>s.exercises||[]).filter(x=>x.group===group).map(x=>x[field?'device':'name']);
 return [...new Set([...(exerciseOptionsByGroup[group]||[]).map(x=>x[field]),...saved].filter(Boolean))].map(x=>'<option value="'+safe(x)+'"></option>').join('');
}
function refreshExerciseChoices(form, suggestDevice=false){
 const group=form.elements.group.value;
 form.querySelector('#exerciseNameOptions').innerHTML='<option value="">اختر من القائمة</option>'+exerciseChoiceOptions(group,0);
 form.querySelector('#exerciseDeviceOptions').innerHTML='<option value="">اختر من القائمة</option>'+exerciseChoiceOptions(group,1);
 if(suggestDevice&&!form.elements.device.value){
  const match=(exerciseOptionsByGroup[group]||[]).find(([name])=>name===form.elements.name.value.trim());
  if(match)form.elements.device.value=match[1];
 }
}

const muscleGroups=['صدر','ظهر','أرجل','أكتاف','باي','تراي','بطن','لياقة'];
const cardioTypes=['مشي','مشي على السير','جري','دراجة','غزالة','إليبتيكال','درج','سباحة','تجديف','أخرى'];
const cardioPhotoDrafts=new Map(),cardioPhotoJobs=new Map();
const TRAINING_PHOTO_BUCKET='training-photos',trainingPhotoUrlCache=new Map();
let trainingDate=null, trainingPhoto='', trainingBusy=false,restTimerHandle=null,restTimerEnd=0,trainingExpandedDate=null,trainingPhotoMigration=null;
function trainingPhotoPath(photo){return typeof photo==='string'&&photo.startsWith('storage://')?photo.slice('storage://'.length):'';}
function isTrainingPhotoData(photo){return /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(photo||'');}
async function uploadTrainingPhoto(dataUrl,date){
 if(!isTrainingPhotoData(dataUrl))return dataUrl||'';
 const {data:{user},error:userError}=await supabaseClient.auth.getUser();if(userError||!user)throw Error('سجّل دخولك أولاً لحفظ الصورة');
 const path=`${user.id}/${date}/${crypto.randomUUID()}.jpg`,blob=await (await fetch(dataUrl)).blob();
 const {error}=await supabaseClient.storage.from(TRAINING_PHOTO_BUCKET).upload(path,blob,{contentType:'image/jpeg',upsert:false});
 if(error)throw Error(error.message.includes('Bucket not found')?'تخزين الصور لم يجهز بعد؛ جرّب بعد اكتمال إعداد المساحة.':'تعذر رفع الصورة: '+error.message);
 return `storage://${path}`;
}
async function deleteTrainingPhoto(photo){
 const path=trainingPhotoPath(photo);if(!path)return;
 const {data:{user}}=await supabaseClient.auth.getUser();if(!user||!path.startsWith(`${user.id}/`))return;
 const {error}=await supabaseClient.storage.from(TRAINING_PHOTO_BUCKET).remove([path]);if(error)console.warn('Could not remove training photo:',error.message);
 trainingPhotoUrlCache.delete(path);
}
async function signedTrainingPhotoUrl(path){
 const cached=trainingPhotoUrlCache.get(path);if(cached&&cached.expires>Date.now()+60000)return cached.url;
 const {data,error}=await supabaseClient.storage.from(TRAINING_PHOTO_BUCKET).createSignedUrl(path,3600);
 if(error)throw error;trainingPhotoUrlCache.set(path,{url:data.signedUrl,expires:Date.now()+3500000});return data.signedUrl;
}
async function hydrateTrainingPhotoImages(){
 const imgs=[...document.querySelectorAll('img[data-training-photo-path]')];await Promise.all(imgs.map(async img=>{const path=img.dataset.trainingPhotoPath;if(!path)return;try{img.src=await signedTrainingPhotoUrl(path);if(img.isConnected&&img.dataset.trainingPhotoPath===path)img.hidden=false;}catch(err){console.warn('Could not load training photo:',err.message);}}));
}
async function migrateLegacyTrainingPhotos(){
 if(trainingPhotoMigration)return trainingPhotoMigration;
 trainingPhotoMigration=(async()=>{
 let changed=false;for(const [date,s] of Object.entries(state.training||{})){
  if(isTrainingPhotoData(s.cardioPhoto)){try{s.cardioPhoto=await uploadTrainingPhoto(s.cardioPhoto,date);changed=true;}catch(err){console.warn('Legacy cardio photo migration paused:',err.message);}}
  for(const x of s.exercises||[])if(isTrainingPhotoData(x.photo)){try{x.photo=await uploadTrainingPhoto(x.photo,date);changed=true;}catch(err){console.warn('Legacy exercise photo migration paused:',err.message);}}
 }
 if(changed){save();await saveCloudSettings();}
 })();try{await trainingPhotoMigration;}finally{trainingPhotoMigration=null;}
}
function sessionFor(date){return state.training?.[date] || {status:'unlogged',groups:[],exercises:[],minutes:0,cardio:0,pain:false};}
function cardioActivitiesFor(s){
 if(Array.isArray(s.cardioActivities))return s.cardioActivities.filter(a=>a&&a.type);
 return Number(s.cardio)>0?[{type:s.cardioType||'',minutes:Number(s.cardio),distance:Number(s.cardioDistance)||0,intensity:s.cardioIntensity||''}]:[];
}
function cardioActivityRow(a={}){
 return `<div class="cardio-entry-fields"><div class="field"><label>نوع النشاط</label><select name="cardioType"><option value="">اختر النشاط</option>${cardioTypes.map(t=>`<option value="${safe(t)}" ${a.type===t?'selected':''}>${tr(t)}</option>`).join('')}</select></div><div class="field"><label>المدة بالدقائق</label><input name="cardio" type="number" min="1" max="300" value="${a.minutes||''}" placeholder="مثال: 20"></div><div class="field"><label>المسافة بالكيلومتر (اختياري)</label><input name="cardioDistance" type="number" min="0" max="500" step="0.01" value="${a.distance||''}"></div><div class="field"><label>الشدة (اختياري)</label><select name="cardioIntensity"><option value="">غير محددة</option>${['خفيفة','متوسطة','عالية'].map(t=>`<option value="${t}" ${a.intensity===t?'selected':''}>${tr(t)}</option>`).join('')}</select></div><button type="button" class="button ghost cardio-remove" onclick="removeCardioActivity(this)">${tr('إزالة')}</button></div>`;
}
function cardioEditor(s){const rows=cardioActivitiesFor(s),total=rows.reduce((n,a)=>n+(Number(a.minutes)||0),0),summary=rows.length?`${fmt(total)} ${tr('دقيقة')} · ${rows.map(a=>tr(a.type)).join('، ')}`:tr('سجّل نشاطك هنا؛ بعد الحفظ يصير مختصر وتقدر تفتحه للتعديل.');return `<details id="cardioActivities" class="cardio-activities" ${rows.length?'':'open'}><summary><strong>${tr('الكارديو')}</strong><span>${safe(summary)}</span><b aria-hidden="true">⌄</b></summary><div class="cardio-activities-content">${(rows.length?rows:[{}]).map(cardioActivityRow).join('')}<button type="button" class="button secondary" onclick="addCardioActivity()">+ ${tr('إضافة نشاط كارديو')}</button><p class="hint">${tr('سجّل كل نشاط ووقته بشكل منفصل؛ مجموع الدقائق يظهر في ملخص اليوم.')}</p></div></details>`;}
function addCardioActivity(){document.querySelector('#cardioActivities .cardio-activities-content')?.insertAdjacentHTML('beforeend',cardioActivityRow());}
function removeCardioActivity(button){const list=document.querySelector('#cardioActivities .cardio-activities-content');button.closest('.cardio-entry-fields')?.remove();if(list&&!list.querySelector('.cardio-entry-fields'))list.insertAdjacentHTML('afterbegin',cardioActivityRow());}
function trainingSummary(s){
 const volume=s.exercises.reduce((n,x)=>n+x.weight*x.reps*x.sets,0);
 const sets=s.exercises.reduce((n,x)=>n+x.sets,0);
 const weight=Number(s.bodyWeight);
 const energy=weight>0 && s.minutes>0 ? [3.5,6].map(m=>Math.round(m*3.5*weight/200*s.minutes)) : null;
 return {volume,sets,energy};
}
function trainingPage(){
 const date=trainingDate||dateNow(),s=sessionFor(date),a=trainingSummary(s);
 if(s.completed&&trainingExpandedDate!==date)return `${completedSessionBar(s,date)}${trainingHistory(date)}`;
 return `<div class="card"><h3>تمرين اليوم</h3><div class="field"><label for="trainingDate">التاريخ</label><input id="trainingDate" type="date" value="${safe(date)}" onchange="trainingDate=this.value;render()"></div><div class="flex" style="margin:16px 0"><button class="button ${s.status==='trained'?'':'secondary'}" onclick="setTrainingStatus('trained')">تمرنت</button><button class="button ${s.status==='rest'?'':'secondary'}" onclick="setTrainingStatus('rest')">راحة</button><span class="hint">${s.status==='unlogged'?'لم تسجّل حالة هذا اليوم':s.status==='rest'?'يوم راحة':'يوم تمرين'}</span></div>${s.status==='trained'?`
 <form class="formGrid" onsubmit="saveTrainingDetails(event)"><fieldset class="full musclePicker"><legend>اختر كل الأقسام التي تمرنتها</legend>${muscleGroups.map(g=>`<label class="checkline"><input type="checkbox" name="group" value="${g}" ${s.groups.includes(g)?'checked':''}>${g}</label>`).join('')}</fieldset><div class="field"><label for="resistanceMinutes">مدة المقاومة بالدقائق، تشمل الراحة بين الجولات</label><input id="resistanceMinutes" name="minutes" type="number" min="0" max="300" value="${s.minutes||0}" required></div><fieldset class="full musclePicker"><legend>${tr('الكارديو')}</legend>${cardioEditor(s)}${cardioPhotoPicker(date,s)}<p class="hint full">${tr('تقدر تسجّل كارديو فقط وتخلي مدة المقاومة صفر. مدة الكارديو منفصلة عن المقاومة.')}</p></fieldset><label class="checkline full"><input type="checkbox" name="pain" ${s.pain?'checked':''}>يوجد ألم أثناء التمرين، خصوصاً الكتف</label><button id="trainingDetailsSave" class="button full" ${cardioPhotoJobs.has(date)?'disabled':''}>حفظ تفاصيل الجلسة</button></form>
 <div class="sectionHead"><h2>أضف تمريناً أو مجموعة جولات</h2></div><form id="exerciseForm" class="formGrid" onsubmit="addExercise(event)"><div class="field full"><label for="exerciseGroup">القسم الأساسي للتمرين</label><select name="group" id="exerciseGroup" onchange="refreshExerciseChoices(this.form)">${muscleGroups.map(g=>`<option>${safe(g)}</option>`).join('')}</select></div><div class="field"><label for="exerciseName">اسم التمرين</label><select id="exerciseNameOptions" aria-label="اختيارات اسم التمرين" onchange="if(this.value){this.form.elements.name.value=this.value;this.form.elements.device.value='';refreshExerciseChoices(this.form,true)}"><option value="">اختر من القائمة</option>${exerciseChoiceOptions(muscleGroups[0],0)}</select><input id="exerciseName" name="name" maxlength="100" required placeholder="أو اكتب اسم التمرين"></div><div class="field"><label for="exerciseDevice">اسم الجهاز أو المعدّة (اختياري)</label><select id="exerciseDeviceOptions" aria-label="اختيارات الجهاز" onchange="if(this.value)this.form.elements.device.value=this.value"><option value="">اختر من القائمة</option>${exerciseChoiceOptions(muscleGroups[0],1)}</select><input id="exerciseDevice" name="device" maxlength="100" placeholder="أو اكتب اسم الجهاز"></div><div class="field"><label for="exerciseWeight">الوزن الكلي المستخدم (كجم)، صفر لوزن الجسم</label><input id="exerciseWeight" name="weight" type="number" min="0" max="1000" step="0.5" required></div><div class="field"><label for="exerciseSets">الجولات بنفس الوزن والتكرارات</label><input id="exerciseSets" name="sets" type="number" min="1" max="30" value="3" required></div><div class="field"><label for="exerciseReps">التكرارات لكل جولة</label><input id="exerciseReps" name="reps" type="number" min="1" max="200" value="10" required></div><div class="field full"><label for="exercisePhoto">صورة الجهاز (اختيارية)</label><input id="exercisePhoto" type="file" accept="image/jpeg,image/png,image/webp" onchange="prepareTrainingPhoto(this)"><div id="photoStatus" class="hint"></div><img id="photoPreview" class="exercisePhoto" alt="معاينة صورة الجهاز" hidden></div><p class="hint full">إذا تغيّر الوزن أو التكرارات بين الجولات، أضف مجموعة جديدة بنفس اسم التمرين. الصورة تُحفظ مع السجل؛ ارجع لمحادثتك مع ChatGPT واطلب مراجعة التطبيق والصور بعد الحفظ.</p><button id="exerciseSave" class="button full">إضافة التمرين</button></form>
 </div>${restTimerCard()}${trainingRoutinePanel(s,date)}<div class="card" style="margin-top:16px"><div class="rowbetween"><h3>ملخص الجلسة</h3><div class="flex">${s.completed?`<button class="button ghost" onclick="collapseCompletedTraining()">إخفاء التفاصيل</button>`:''}<button class="button ${s.completed?'secondary':'primary'}" onclick="finishTraining('${date}')">${s.completed?'حفظ وإنهاء':'إنهاء التمرين وحفظه'}</button></div></div><p class="hint">${s.completed?'انتهى التمرين وحُفظ. تقدر ترجع تعدّل الجلسة متى ما احتجت.':'بعد آخر جولة، اضغط إنهاء التمرين لحفظ الجلسة ووضع علامة أنها انتهت.'}</p><button class="button secondary" onclick="copyCoachSummary(true)">نسخ الجلسة لـChatGPT</button><p class="hint">انسخ الجلسة والصقها في محادثتك، أو اطلب من المساعد فتح التطبيق ومراجعتها. أرفق الصور في المحادثة عند الحاجة.</p><div id="copyStatus" class="subtle" style="white-space:pre-wrap"></div><p>${safe(cardioDescription(s))}</p>${cardioPhotoImage(s.cardioPhoto)}<p>${fmt(s.exercises.length)} مجموعات تمارين مسجلة • ${fmt(a.sets)} جولة • حجم الأوزان ${fmt(a.volume)} كجم</p>${s.bodyWeight?`<p class="hint">الوزن المستخدم للتقدير: ${fmt(s.bodyWeight)} كجم، آخر وزن مسجل حتى هذا التاريخ.</p>`:''}<p>${a.energy?`طاقة المقاومة التقديرية: ${fmt(a.energy[0])} - ${fmt(a.energy[1])} سعرة إجمالية تشمل طاقة الراحة.`:'سجّل مدة المقاومة ووزناً بتاريخ الجلسة أو قبلها لإظهار تقدير الطاقة.'}</p><p class="hint">هذا نطاق تقريبي واسع حسب شدة الجلسة، وليس قياساً فعلياً ولا توصية بزيادة الأكل. لا يشمل الكارديو. حجم الأوزان لا يساوي سعرات، ولا يحسب وزن الجسم في تمارين وزن الجسم. <a href="https://pacompendium.com/conditioning-exercise/" target="_blank" rel="noopener">مرجع تقدير النشاط</a></p>${s.pain?'<p class="notice">سجّلت ألماً. أوقف الحركة المؤلمة ولا تزد الحمل عليها. راجع مختصاً لتقييم ألم الكتف قبل اقتراح تمارين له.</p>':''}${s.exercises.map((x,i)=>exerciseCard(x,i,date)).join('')||'<div class="empty">أضف أول تمرين للجلسة</div>'}</div>`:'</div>'}
 ${trainingHistory()}`;
}
function completedSessionTitle(s){const count=s.exercises?.length||0;if(count)return s.exercises[0].name+(count>1?' + '+fmt(count-1)+' تمارين':'');return s.cardio>0?'كارديو '+(s.cardioType||''):'جلسة تدريب';}
function completedSessionBar(s,date){const groups=s.groups?.length?' · '+safe(s.groups.join('، ')):'';return `<div class="card completed-session-bar"><div class="completed-session-copy"><strong>${safe(completedSessionTitle(s))}</strong><small>${safe(date)}${groups}</small></div><button class="button" onclick="openTrainingSession('${date}')">فتح وتعديل</button></div>`;}
function trainingHistory(excludeDate=''){const rows=Object.entries(state.training||{}).filter(([d])=>d!==excludeDate).sort(([a],[b])=>b.localeCompare(a));return `<div class="card" style="margin-top:16px"><h3>سجل التمرين والراحة</h3>${rows.map(([d,x])=>`<div class="meal"><span>${safe(d)} • ${x.status==='rest'?'راحة':'تمرين'} • ${safe(x.groups.join('، '))}</span><button class="button ghost" onclick="trainingDate='${safe(d)}';go('training')">عرض</button></div>`).join('')||'<div class="empty">ما سجلت أيام للحين</div>'}</div>`;}
function openTrainingSession(date){trainingDate=date;trainingExpandedDate=date;render();window.scrollTo(0,0);}
function collapseCompletedTraining(){trainingExpandedDate=null;render();}
function restTimerSeconds(){return Math.max(0,Math.ceil((restTimerEnd-Date.now())/1000));}
function restTimerCard(){const left=restTimerSeconds(),label=left?`${Math.floor(left/60)}:${String(left%60).padStart(2,'0')}`:'جاهز';return `<div class="card rest-timer" style="margin-top:16px"><div class="rowbetween"><div><h3>مؤقت الراحة بين الجولات</h3><p id="restTimerDisplay" class="rest-clock">${label}</p></div><div class="flex"><button type="button" class="button secondary" onclick="startRestTimer(60)">60 ثانية</button><button type="button" class="button secondary" onclick="startRestTimer(90)">90 ثانية</button><button type="button" class="button secondary" onclick="startRestTimer(120)">دقيقتان</button><button type="button" class="button ghost" onclick="stopRestTimer()">إيقاف</button></div></div></div>`;}
function startRestTimer(seconds){restTimerEnd=Date.now()+seconds*1000;if(restTimerHandle)clearInterval(restTimerHandle);tickRestTimer();restTimerHandle=setInterval(tickRestTimer,250);}
function stopRestTimer(){restTimerEnd=0;if(restTimerHandle)clearInterval(restTimerHandle);restTimerHandle=null;const el=document.getElementById('restTimerDisplay');if(el)el.textContent='جاهز';}
function tickRestTimer(){const el=document.getElementById('restTimerDisplay');if(!el)return;const left=restTimerSeconds();el.textContent=left?`${Math.floor(left/60)}:${String(left%60).padStart(2,'0')}`:'انتهت الراحة — ابدأ الجولة';if(left===0&&restTimerHandle){clearInterval(restTimerHandle);restTimerHandle=null;}}
function trainingRoutinePanel(s,date){const routines=state.trainingRoutines||{};return `<div class="card routine-card" style="margin-top:16px"><div class="rowbetween"><div><h3>روتينات الحديد</h3><p class="hint">احفظ تمارين جلسة كقالب، ثم استخدمه مرة ثانية وعدّل الأوزان حسب أدائك.</p></div>${s.exercises.length?`<button class="button secondary" onclick="saveTrainingRoutine('${date}')">حفظ الجلسة كروتين</button>`:''}</div>${Object.entries(routines).map(([id,r])=>`<div class="routine-line"><div><strong>${safe(r.name)}</strong><small>${r.exercises.length} تمرين · ${r.exercises.map(x=>safe(x.name)).join('، ')}</small></div><div class="flex"><button class="button secondary" onclick="useTrainingRoutine('${safe(id)}','${date}')">استخدم الروتين</button><button class="button ghost" onclick="deleteTrainingRoutine('${safe(id)}')">حذف</button></div></div>`).join('')||'<p class="empty">احفظ أول روتين من تمارين جلسة مسجلة.</p>'}</div>`;}
async function saveTrainingRoutine(date){const s=sessionFor(date);if(!s.exercises.length)return;const name=prompt('اسم الروتين، مثل: دفع أو سحب');if(!name?.trim())return;state.trainingRoutines||={};state.trainingRoutines[String(Date.now())]={name:name.trim().slice(0,60),exercises:s.exercises.map(({name,device,group,weight,sets,reps})=>({name,device,group,weight,sets,reps}))};save();await saveCloudSettings();render();}
async function useTrainingRoutine(id,date){const r=state.trainingRoutines?.[id];if(!r)return;const s=sessionFor(date);if(s.exercises.length&&!confirm('استبدال تمارين اليوم بهذا الروتين؟'))return;s.exercises=r.exercises.map(x=>({...x,photo:''}));s.status='trained';s.completed=false;for(const x of s.exercises)if(!s.groups.includes(x.group))s.groups.push(x.group);state.training||={};state.training[date]=s;await persistTraining();render();}
async function deleteTrainingRoutine(id){if(!confirm('حذف هذا الروتين؟'))return;delete state.trainingRoutines[id];save();await saveCloudSettings();render();}
function exerciseCard(x,i,date){
 const prev=Object.entries(state.training||{}).filter(([d])=>d<date).sort(([a],[b])=>b.localeCompare(a)).flatMap(([,s])=>s.exercises).find(e=>e.name.trim()===x.name.trim()&&e.group===x.group&&(e.device||'')===(x.device||''));
 const delta=prev?x.weight-prev.weight:null,comparison=prev?`${delta>0?'زادت الأوزان ':delta<0?'انخفض الوزن ':'نفس الوزن '} ${delta===0?'':(delta>0?'+':'')+fmt(delta)+' كجم'} عن آخر تمرين؛ ${fmt(prev.weight)} كجم × ${fmt(prev.reps)} × ${fmt(prev.sets)} جولة.`:'';
 const photoPath=trainingPhotoPath(x.photo),photo=isTrainingPhotoData(x.photo)?`<img class="exercisePhoto" alt="صورة الجهاز المسجلة" src="${x.photo}">`:photoPath?`<img class="exercisePhoto" alt="صورة الجهاز المسجلة" data-training-photo-path="${safe(photoPath)}" hidden>`:'';
 return `<div class="meal"><div><strong>${safe(x.name)} • ${safe(x.group)}${x.device?' • '+safe(x.device):''}</strong><small>${fmt(x.weight)} كجم × ${fmt(x.reps)} تكرار × ${fmt(x.sets)} جولة${prev?`<br>آخر مرة: ${safe(comparison)} قارن نفس الجهاز وطريقة الأداء.`:''}</small>${photo}<a href="https://www.youtube.com/results?search_query=${encodeURIComponent([x.name,x.device,'شرح الأداء الصحيح'].filter(Boolean).join(' '))}" target="_blank" rel="noopener">ابحث عن شرح فيديو للتمرين</a><small>نتائج بحث، وليست فيديوهات مختارة أو مراجعة من المدرب.</small></div><div class="flex"><button class="button ghost" onclick="removeExercisePhoto(${i})" ${x.photo?'':'hidden'}>إزالة الصورة</button><button class="button ghost" onclick="deleteExercise(${i})">حذف</button></div></div>`;
}
async function persistTraining(){
 try{save();}catch{alert('مساحة الجهاز ممتلئة. احذف صورة غير لازمة أو صدّر نسخة احتياطية. لم يكتمل الحفظ.');return false;}
 return await saveCloudSettings();
}
async function setTrainingStatus(status){
 const date=trainingDate||dateNow(),old=sessionFor(date);
 if(status==='rest' && (old.exercises.length || old.cardio>0 || cardioActivitiesFor(old).length || old.minutes>0 || old.cardioPhoto) && !confirm('تحويل اليوم إلى راحة يحذف تمارين وكارديو هذا اليوم. تبي تكمل؟'))return;
 if(status==='rest'){cardioPhotoJobs.delete(date);cardioPhotoDrafts.delete(date);}
 state.training||={};state.training[date]=status==='rest'?{status,groups:[],exercises:[],minutes:0,cardio:0,cardioActivities:[],pain:false}:{...old,status};
 await persistTraining();render();
}
async function saveTrainingDetails(e,finish=false){
 e.preventDefault();const f=new FormData(e.target),date=trainingDate||dateNow();const s=sessionFor(date);
 if(cardioPhotoJobs.has(date))return alert('انتظر تجهيز صورة الكارديو');
 let cardioPhoto=cardioPhotoDrafts.has(date)?cardioPhotoDrafts.get(date):(s.cardioPhoto||'');
 const cardioTypesInput=f.getAll('cardioType').map(String),cardioMinutesInput=f.getAll('cardio').map(x=>String(x||'')),cardioDistanceInput=f.getAll('cardioDistance').map(x=>String(x||'')),cardioIntensityInput=f.getAll('cardioIntensity').map(String);
 const cardioActivities=[];let cardioInvalid=false;for(let i=0;i<cardioTypesInput.length;i++){const type=cardioTypesInput[i],rawMinutes=cardioMinutesInput[i],rawDistance=cardioDistanceInput[i],intensity=cardioIntensityInput[i],minutes=Number(rawMinutes)||0,distance=Number(rawDistance)||0;const touched=Boolean(type||rawMinutes||rawDistance||intensity);if(!touched)continue;if(!cardioTypes.includes(type)||!Number.isFinite(minutes)||minutes<=0||minutes>300||!Number.isFinite(distance)||distance<0||distance>500){cardioInvalid=true;break;}cardioActivities.push({type,minutes,distance,intensity});}
 if(cardioInvalid)return alert('لكل نشاط كارديو تختاره، أدخل المدة وراجع المسافة');
 const cardio=cardioActivities.reduce((n,a)=>n+a.minutes,0),cardioType=cardioActivities.map(a=>a.type).join('، '),cardioDistance=cardioActivities.reduce((n,a)=>n+a.distance,0),cardioIntensity=cardioActivities.map(a=>a.intensity).filter(Boolean).join('، ');
 const groups=f.getAll('group');for(const x of s.exercises)if(!groups.includes(x.group))groups.push(x.group);
 const weight=[...state.weights].filter(w=>w.date<=date).sort((a,b)=>b.date.localeCompare(a.date))[0]?.weight;
 const previousPhoto=s.cardioPhoto||'';
 try{if(isTrainingPhotoData(cardioPhoto))cardioPhoto=await uploadTrainingPhoto(cardioPhoto,date);}catch(err){return alert(err.message||'تعذر حفظ صورة الكارديو');}
 state.training[date]={...s,groups,minutes:Number(f.get('minutes')),cardio,cardioActivities,cardioType,cardioDistance,cardioIntensity,cardioPhoto,pain:f.has('pain'),bodyWeight:weight||null,completed:finish};
 const saved=await persistTraining();if(saved){cardioPhotoDrafts.delete(date);if(finish)trainingExpandedDate=null;}render();
 if(saved&&previousPhoto&&previousPhoto!==cardioPhoto)await deleteTrainingPhoto(previousPhoto);
}
function finishTraining(date){const form=document.querySelector('#view form[onsubmit="saveTrainingDetails(event)"]');if(!form||!form.reportValidity())return;saveTrainingDetails({preventDefault(){},target:form},true);}
async function reopenTraining(date){const s=sessionFor(date);s.completed=false;state.training[date]=s;await persistTraining();render();}
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
 const x={name:String(f.get('name')).trim(),device:String(f.get('device')||'').trim().slice(0,100),group:String(f.get('group')),weight:Number(f.get('weight')),sets:Number(f.get('sets')),reps:Number(f.get('reps')),photo:trainingPhoto};
 if(!x.name||!muscleGroups.includes(x.group)||!Number.isFinite(x.weight)||x.weight<0||x.weight>1000||!Number.isInteger(x.sets)||x.sets<1||x.sets>30||!Number.isInteger(x.reps)||x.reps<1||x.reps>200)return alert('راجع اسم التمرين والأوزان والجولات والتكرارات');
 try{if(isTrainingPhotoData(x.photo))x.photo=await uploadTrainingPhoto(x.photo,date);}catch(err){return alert(err.message||'تعذر حفظ صورة التمرين');}
 s.exercises.push(x);s.status='trained';s.completed=false;if(!s.groups.includes(x.group))s.groups.push(x.group);state.training||={};state.training[date]=s;
 trainingPhoto='';const saved=await persistTraining();if(!saved&&trainingPhotoPath(x.photo))await deleteTrainingPhoto(x.photo);render();
}
async function removeExercisePhoto(i){const s=sessionFor(trainingDate||dateNow()),x=s.exercises[i];if(!x?.photo||!confirm('إزالة صورة الجهاز؟ سيبقى التمرين وأوزانه محفوظة.'))return;const old=x.photo;x.photo='';s.completed=false;const saved=await persistTraining();if(saved)await deleteTrainingPhoto(old);render();}
async function deleteExercise(i){if(!confirm('حذف مجموعة الجولات هذه؟'))return;const s=sessionFor(trainingDate||dateNow()),old=s.exercises[i]?.photo;s.exercises.splice(i,1);s.completed=false;const saved=await persistTraining();if(saved)await deleteTrainingPhoto(old);render();}
function chefMessage(){
 const d=state.openDay,ar=d?`اليوم ${d} من الجدول يوم مفتوح كامل. لا تحضّر وجبات النظام لهذا اليوم إلا بطلب منفصل.`:'تم إلغاء اختيار اليوم المفتوح. يرجى مراجعة صاحب الجدول قبل تحضير وجبات اليوم السابع.';
 const en=d?`Day ${d} of the plan is a full open day. Do not prepare diet meals for this day unless separately requested.`:'The open-day selection has been cancelled. Please confirm day-seven meals with the plan owner.';
 return `${ar}\n\n${en}`;
}
function chefSharePanel(){return `<div class="card" style="margin-top:16px"><h3>إبلاغ الطباخ باليوم المفتوح</h3><p style="white-space:pre-wrap">${safe(chefMessage())}</p><a class="button" href="https://wa.me/?text=${encodeURIComponent(chefMessage())}" target="_blank" rel="noopener">فتح واتساب برسالة جاهزة</a><p class="hint">اختر محادثة الطباخ وراجع الرسالة ثم أرسلها بنفسك. لا يتم إرسال شيء تلقائياً.</p></div>`;}

function coachSummarySource(sessionOnly=false){
 const date=trainingDate||dateNow();
 const sessions=sessionOnly?[[date,sessionFor(date)]]:Object.entries(state.training||{}).sort(([a],[b])=>b.localeCompare(a)).slice(0,14);
 const lines=['راجع بياناتي التالية وقدّم ملاحظاتك بالعربية. أي تعديل على الجدول يحتاج موافقتي.'];
 if(!sessionOnly){lines.push('أهدافي: '+JSON.stringify(state.profile),'آخر الأوزان: '+JSON.stringify([...state.weights].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,10)),'آخر القياسات: '+JSON.stringify([...state.measurements].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5)),'اليوم الحالي من البرنامج: '+state.day+'؛ اليوم المفتوح: '+(state.openDay||'لم يحدد'));}
 for(const [d,s] of sessions){lines.push('التاريخ: '+d+' | '+(s.status==='rest'?'راحة':'تمرين')+' | الأقسام: '+s.groups.join('، '),'مدة المقاومة: '+s.minutes+' دقيقة؛ '+cardioDescription(s)+(s.cardioPhoto?'؛ توجد صورة جهاز الكارديو محفوظة':'')+'؛ ألم: '+(s.pain?'نعم':'لا'));for(const x of s.exercises)lines.push(x.name+(x.device?' - '+x.device:'')+' ('+x.group+'): '+x.weight+' كجم × '+x.reps+' تكرار × '+x.sets+' جولة'+(x.photo?'؛ توجد صورة محفوظة':''));}
 return lines.join('\n');
}
async function copyCoachSummary(sessionOnly=false){
 const text=coachSummary(sessionOnly),status=document.getElementById('copyStatus');
 try{await navigator.clipboard.writeText(text);status.textContent='تم النسخ. الصق الملخص في محادثتك مع ChatGPT.';}catch{status.textContent='تعذر النسخ التلقائي. انسخ النص التالي يدوياً.';let box=document.getElementById('manualSummary');if(!box){box=document.createElement('textarea');box.id='manualSummary';box.readOnly=true;box.style.width='100%';status.after(box);}box.value=text;box.focus();box.select();}
}

function cardioDescription(s){const activities=cardioActivitiesFor(s);return activities.length?tr('الكارديو')+': '+activities.map(a=>`${tr(a.type)} • ${fmt(a.minutes)} ${tr('دقيقة')}${a.distance?' • '+fmt(a.distance)+' كم':''}${a.intensity?' • '+tr(a.intensity):''}`).join('؛ ')+' • '+tr('المجموع')+' '+fmt(activities.reduce((n,a)=>n+a.minutes,0))+' '+tr('دقيقة'):tr('لم تسجّل كارديو لهذا اليوم');}

function cardioPhotoImage(photo){const path=trainingPhotoPath(photo);return isTrainingPhotoData(photo)?`<img class="exercisePhoto" alt="صورة جهاز الكارديو" src="${photo}">`:path?`<img class="exercisePhoto" alt="صورة جهاز الكارديو" data-training-photo-path="${safe(path)}" hidden>`:'';}
function cardioPhotoPicker(date,s){
 const photo=cardioPhotoDrafts.has(date)?cardioPhotoDrafts.get(date):s.cardioPhoto;
 return `<div class="field full"><label for="cardioPhotoFile">صورة الجهاز (اختيارية)</label><input id="cardioPhotoFile" type="file" accept="image/*" onchange="prepareCardioPhoto(this)"><div id="cardioPhotoStatus" class="hint">${cardioPhotoJobs.has(date)?'جاري تجهيز الصورة…':''}</div><div id="cardioPhotoPreview">${cardioPhotoImage(photo)}</div><button id="removeCardioPhoto" type="button" class="button ghost" onclick="removeCardioPhoto()" ${photo?'':'hidden'}>إزالة صورة الكارديو</button><p class="hint">تُحفظ الصورة مع تفاصيل الجلسة عند الضغط على «حفظ تفاصيل الجلسة». التصوير المباشر يعتمد على دعم جهازك ومتصفحك.</p></div>`;
}
function removeCardioPhoto(){
 const date=trainingDate||dateNow();cardioPhotoJobs.delete(date);cardioPhotoDrafts.set(date,'');
 document.getElementById('cardioPhotoPreview').innerHTML='';document.getElementById('cardioPhotoStatus').textContent='اضغط حفظ تفاصيل الجلسة لتأكيد إزالة الصورة';document.getElementById('removeCardioPhoto').hidden=true;document.getElementById('trainingDetailsSave').disabled=false;
 document.getElementById('cardioPhotoFile').value='';
}
async function prepareCardioPhoto(input){
 const file=input.files?.[0];if(!file)return;
 const date=trainingDate||dateNow(),job={};cardioPhotoJobs.set(date,job);
 const active=()=>date===(trainingDate||dateNow())&&document.getElementById('cardioPhotoStatus');
 if(active()){document.getElementById('trainingDetailsSave').disabled=true;document.getElementById('cardioPhotoStatus').textContent='جاري تجهيز الصورة…';}
 try{
  if(file.size>15*1024*1024)throw Error('اختر صورة أصغر من 15 ميجابايت');
  const bitmap=await createImageBitmap(file),scale=Math.min(1,640/Math.max(bitmap.width,bitmap.height));
  const canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
  const photo=canvas.toDataURL('image/jpeg',0.65);if(photo.length>180000)throw Error('الصورة كبيرة بعد التصغير؛ جرّب صورة أبسط');
  if(cardioPhotoJobs.get(date)!==job)return;
  cardioPhotoDrafts.set(date,photo);
  if(active()){document.getElementById('cardioPhotoPreview').innerHTML=cardioPhotoImage(photo);document.getElementById('removeCardioPhoto').hidden=false;document.getElementById('cardioPhotoStatus').textContent='الصورة جاهزة؛ اضغط حفظ تفاصيل الجلسة';}
 }catch(err){if(cardioPhotoJobs.get(date)===job&&active())document.getElementById('cardioPhotoStatus').textContent=err.message||'تعذر قراءة الصورة؛ جرّب صورة JPEG أو PNG';}
 finally{if(cardioPhotoJobs.get(date)===job){cardioPhotoJobs.delete(date);if(active())document.getElementById('trainingDetailsSave').disabled=false;}}
}

function coachSummary(sessionOnly=false){return tr(coachSummarySource(sessionOnly));}

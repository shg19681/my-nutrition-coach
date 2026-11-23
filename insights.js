function insightCopy(ar,en){return appLanguage==='en'?en:ar;}
function insightDates(){
 const today=dateNow(),dates=[];
 for(let i=1;i<=30;i++){
  const date=addDate(today,-i),key=weekStart(date),index=new Date(date+'T12:00:00Z').getUTCDay(),week=getMealWeek(key);
  const hasLogs=Boolean(state.training?.[date]||state.weights?.some(w=>w.date===date)||Object.keys(state.mealDone||{}).some(k=>k.startsWith(date+'-')));
  if(hasLogs||week?.status==='approved')dates.push(date);
 }
 return dates;
}
function insightMealData(date){
 const key=weekStart(date),index=new Date(date+'T12:00:00Z').getUTCDay(),week=getMealWeek(key),meals=datedMeals(key,index);
 const rows=meals.map((meal,i)=>({meal,i,kcal:mealRowsCalories(date,i,meal,false).total,done:Boolean(state.mealDone?.[date+'-'+i])}));
 return {week,rows,planned:rows.reduce((n,x)=>n+x.kcal,0),logged:rows.filter(x=>x.done).reduce((n,x)=>n+x.kcal,0),doneCount:rows.filter(x=>x.done).length,isOpen:Boolean(week&&azmIsOpen(week,index))};
}
function insightWeight(date){
 const weights=[...(state.weights||[])].sort((a,b)=>a.date.localeCompare(b.date));
 const current=weights.find(w=>w.date===date),previous=weights.filter(w=>w.date<date).at(-1);
 return {current,previous,change:current&&previous?Number((current.weight-previous.weight).toFixed(1)):null};
}
function insightWeekBounds(){
 const today = dateNow();
 const saturday = addDate(today, -((new Date(today+'T12:00:00Z').getUTCDay()+1)%7));
 const currentEnd = addDate(saturday,-1);
 const currentStart = addDate(saturday,-7);
 return {saturday,currentStart,currentEnd,previousSaturday:currentStart,weightStart:addDate(saturday,-6),previousWeightStart:addDate(saturday,-13)};
}
function insightSessionCardio(s){return Array.isArray(s?.cardioActivities)?s.cardioActivities.reduce((n,a)=>n+(Number(a.minutes)||0),0):(Number(s?.cardio)||0);}
function insightWeeklyStats(start,end){
 const days=Array.from({length:7},(_,i)=>addDate(start,i)),sessions=days.map(d=>state.training?.[d]).filter(Boolean);
 const groups=[...new Set(sessions.flatMap(s=>[...(s.groups||[]),...(s.exercises||[]).map(x=>x.group)].filter(Boolean)))];
 const cardioTypes=[...new Set(sessions.flatMap(s=>cardioActivitiesFor(s).map(a=>a.type).filter(Boolean)))];
 return {strengthDays:days.filter(d=>(state.training?.[d]?.exercises||[]).length).length,cardioMinutes:sessions.reduce((n,s)=>n+insightSessionCardio(s),0),loggedDays:sessions.length,trainedDays:sessions.filter(s=>s.status==='trained').length,restDays:7-sessions.filter(s=>s.status==='trained').length,inferredRestDays:7-sessions.filter(s=>s.status==='trained'||s.status==='rest').length,groups,cardioTypes};
}
function insightFoodWeeklyStats(start,end){
 const days=Array.from({length:7},(_,i)=>addDate(start,i)).map(insightMealData),plannedDays=days.filter(d=>d.week?.status==='approved'&&d.rows.length&&!d.isOpen),checked=plannedDays.reduce((n,d)=>n+d.doneCount,0),available=plannedDays.reduce((n,d)=>n+d.rows.length,0),loggedCalories=plannedDays.reduce((n,d)=>n+d.logged,0),loggedDays=plannedDays.filter(d=>d.doneCount>0).length;
 const completeDays=plannedDays.filter(d=>d.doneCount===d.rows.length);
 return {checked,available,loggedCalories,loggedDays,plannedDays:plannedDays.length,completeDays:completeDays.length,adherence:available?checked/available:null,average:completeDays.length?completeDays.reduce((n,d)=>n+d.logged,0)/completeDays.length:null};
}
function insightWeightAverage(start,end){
 const readings=(state.weights||[]).filter(w=>w.date>=start&&w.date<=end&&Number.isFinite(Number(w.weight)));
 return {readings,average:readings.length?readings.reduce((n,w)=>n+Number(w.weight),0)/readings.length:null};
}
function insightMeasurementChanges(currentStart,currentEnd,previousStart,previousEnd){
 const labels={waist:['محيط البطن','waist'],hips:['محيط الحوض','hips'],chest:['محيط الصدر','chest'],arm:['محيط الذراع','arm'],thigh:['محيط الفخذ','thigh']};
 return Object.entries(labels).flatMap(([key,label])=>{
  const current=(state.measurements||[]).filter(x=>x.date>=currentStart&&x.date<=currentEnd&&Number(x[key])>0).sort((a,b)=>a.date.localeCompare(b.date)).at(-1);
  const previous=(state.measurements||[]).filter(x=>x.date>=previousStart&&x.date<=previousEnd&&Number(x[key])>0).sort((a,b)=>a.date.localeCompare(b.date)).at(-1);
  return current&&previous?[{label:insightCopy(...label),delta:Number((Number(current[key])-Number(previous[key])).toFixed(1))}]:[];
 });
}
function insightLatestMeasurementChanges(currentStart,currentEnd){
 const labels={waist:['محيط البطن','waist'],hips:['محيط الحوض','hips'],chest:['محيط الصدر','chest'],arm:['محيط الذراع','arm'],thigh:['محيط الفخذ','thigh']};
 return Object.entries(labels).flatMap(([key,label])=>{
  const rows=(state.measurements||[]).filter(x=>Number(x[key])>0&&x.date<=currentEnd).sort((a,b)=>a.date.localeCompare(b.date));
  const current=rows.filter(x=>x.date>=currentStart).at(-1),previous=rows.filter(x=>x.date<currentStart).at(-1);
  return current&&previous?[{label:insightCopy(...label),delta:Number((Number(current[key])-Number(previous[key])).toFixed(1)),date:current.date}]:[];
 });
}
function insightExerciseAdvice(start,end){
 const entries=Object.entries(state.training||{}).filter(([d,s])=>d>=start&&d<=end&&s.status==='trained');
 if(!entries.length)return insightCopy('ما فيه تمارين مقاومة مسجلة في الأسبوع المكتمل؛ سجّل الجولات والأوزان حتى أقدر أقارن التقدم.','No resistance sessions were logged in the completed week. Record sets and weights so progress can be compared.');
 if(entries.some(([,s])=>s.pain))return insightCopy('ظهر تسجيل ألم هذا الأسبوع: لا تزِد حمل الحركة المؤلمة، وأوقفها إذا استمر الألم.','Pain was logged this week: do not increase the load on the painful movement, and stop it if pain continues.');
 const picks=[];
 for(const [date,session] of entries.sort(([a],[b])=>a.localeCompare(b))){
  for(const exercise of session.exercises||[]){
   const key=String(exercise.name||'').trim().toLocaleLowerCase();if(!key)continue;
   const prev=Object.entries(state.training||{}).filter(([d,s])=>d<start&&d>=addDate(start,-42)&&(s.exercises||[]).some(x=>String(x.name||'').trim().toLocaleLowerCase()===key)).sort(([a],[b])=>b.localeCompare(a))[0];
   const old=prev?.[1]?.exercises?.find(x=>String(x.name||'').trim().toLocaleLowerCase()===key);
   let advice=old?insightCopy('إذا أتممت الجولات والتكرارات بتكنيك مريح وبدون ألم، زِد شيئاً واحداً فقط في المرة القادمة: تكرار لكل جولة أو أصغر درجة وزن متاحة.','If you completed the sets and reps with comfortable form and no pain, increase just one thing next time: one rep per set or the smallest available weight increment.'):insightCopy('هذا أول تسجيل للمقارنة. كرر الوزن والتكرارات وسجّل كيف كانت صعوبة الجولات.','This is the first entry for comparison. Repeat the load and reps, and note how challenging the sets felt.');
   if(old&&(Number(exercise.weight)>Number(old.weight)||Number(exercise.reps)>Number(old.reps)))advice=insightCopy('سجلت تقدماً عن المرة السابقة؛ ثبّت الوزن والتكرارات الجديدة في الحصة القادمة وتأكد من جودة الحركة قبل زيادة أخرى.','You progressed from the previous entry; keep the new load and reps next session, and confirm good form before progressing again.');
   else if(old&&(Number(exercise.weight)<Number(old.weight)||Number(exercise.reps)<Number(old.reps)))advice=insightCopy('إذا كانت الجولات صعبة أو التكنيك يتأثر، ثبّت الوزن الحالي وحاول إكمال التكرارات بجودة قبل أي زيادة.','If the sets were difficult or form was affected, keep the current load and complete the reps with good form before increasing.');
   picks.push(`<li><b>${safe(exercise.name)}</b> — ${advice}</li>`);
  }
 }
 const unique=[...new Map(picks.map(x=>[x.slice(0,Math.min(x.indexOf('</b>'),120)),x])).values()].slice(0,4);
 return unique.length?`<ul class="insight-advice-list">${unique.join('')}</ul>`:insightCopy('سجّل التمارين والأوزان والتكرارات حتى تظهر مراجعة التقدم.','Log exercises, weights, and reps to see progression advice.');
}
function insightSaturdayEntries(saturday){
 const weight=(state.weights||[]).find(x=>x.date===saturday&&Number(x.weight)>0);
 const measurement=(state.measurements||[]).find(x=>x.date===saturday&&['waist','hips','chest','arm','thigh'].some(k=>Number(x[k])>0));
 return {weight,measurement};
}
function insightAlternativeExercises(start,end){
 const sessions=Object.entries(state.training||{}).filter(([d,s])=>d>=start&&d<=end&&s.status==='trained');
 if(!sessions.length||sessions.some(([,s])=>s.pain))return '';
 const alternatives=[
  [/سكوات|squat/i,'ضغط الأرجل','leg press', 'https://www.nasm.org/resource-center/exercise-library/leg-press'],
  [/ضغط أرجل|ليج برس|leg press/i,'سكوات إلى صندوق','box squat', 'https://www.youtube.com/watch?v=-GaRp6_b2vk'],
  [/بنش|ضغط صدر|chest press|bench press/i,'جهاز ضغط الصدر بقبضة مريحة','machine chest press with a comfortable grip', 'https://www.acefitness.org/resources/everyone/exercise-library/188/seated-chest-press/'],
  [/تجديف|rowing|\brow\b/i,'تجديف بجهاز يسند الصدر','chest-supported row', 'https://www.acefitness.org/resources/everyone/exercise-library/equipment/weight-machines-selectorized/'],
  [/سحب أمامي|pulldown/i,'سحب أمامي بقبضة محايدة','neutral-grip lat pulldown', 'https://www.acefitness.org/resources/everyone/exercise-library/158/seated-lat-pulldown/'],
  [/بلانك|plank/i,'تمرين Dead Bug','dead bug', 'https://www.nasm.org/resource-center/exercise-library/dead-bug'],
 ];
 const names=[...new Set(sessions.flatMap(([,s])=>(s.exercises||[]).map(x=>String(x.name||'').trim()).filter(Boolean)))];
 const picks=names.flatMap(name=>{const match=alternatives.find(([pattern])=>pattern.test(name));return match?[safe(name)+' ← <a href="'+safe(match[3])+'" target="_blank" rel="noopener noreferrer">'+safe(insightCopy(match[1],match[2]))+' · '+insightCopy('الجهاز وطريقة الأداء','Equipment and technique')+'</a>']:[];}).slice(0,3);
 return picks.length?'<p>'+insightCopy('بدائل من تمارينك المسجلة عند الحاجة. جرّبها بحمل مريح إذا كانت الحركة بلا ألم.','Alternatives for your logged exercises. Try a comfortable load when the movement is pain-free.')+'</p><ul>'+picks.map(x=>'<li>'+x+'</li>').join('')+'</ul>':'';
}
function insightWeeklyCard(){
 const w=insightWeekBounds(), saturday=insightSaturdayEntries(w.saturday);
 const priorMeasurement=w.saturday==='2026-11-21'&&!saturday.measurement
  ? (state.measurements||[]).filter(x=>x.date<w.saturday&&['waist','hips','chest','arm','thigh'].some(k=>Number(x[k])>0)).sort((a,b)=>b.date.localeCompare(a.date))[0]
  : null;
 const measurementDate=(saturday.measurement||priorMeasurement)?.date;
 
 if(!saturday.weight||!measurementDate)return `<div class="card insight-weekly"><h3>${insightCopy('تحليل السبت','Saturday review')} · <bdi dir="ltr">${safe(w.saturday)}</bdi></h3><p>${insightCopy('تظهر المراجعة بعد تسجيل وزن السبت وقياس واحد على الأقل بنفس التاريخ.','The review appears after you log Saturday’s weight and at least one measurement on that date.')}</p><p>${insightCopy('الوزن','Weight')}: ${saturday.weight?insightCopy('مسجل','Logged'):insightCopy('ناقص','Missing')} · ${insightCopy('القياسات','Measurements')}: ${saturday.measurement?insightCopy('مسجلة','Logged'):insightCopy('ناقصة','Missing')}</p></div>`;
 const stats=insightWeeklyStats(w.currentStart,w.currentEnd),food=insightFoodWeeklyStats(w.currentStart,w.currentEnd);
 const current=insightWeightAverage(w.weightStart,w.saturday),previous=insightWeightAverage(w.previousWeightStart,w.previousSaturday);
 const changes=insightLatestMeasurementChanges(measurementDate,measurementDate),exerciseAdvice=insightExerciseAdvice(w.currentStart,w.currentEnd);
 const targetDays=Number(state.profile.trainingDays)||5;
 const strength=insightCopy(`سجلت ${fmt(stats.trainedDays)} من ${fmt(targetDays)} أيام تمرين، منها ${fmt(stats.strengthDays)} فيها تمارين مقاومة بالتفصيل، و${fmt(stats.restDays)} من ${fmt(7-targetDays)} أيام راحة. ${stats.trainedDays>=targetDays?'وصلت لهدف عدد أيام التمرين؛ راجع التقدم والتعافي تحت.':stats.loggedDays<7?'الأيام المكتملة اللي ما سجلت فيها تمرين أو راحة حسبناها راحة.':'عدد أيام التمرين المسجلة أقل من خطتك.'}`,`You logged ${stats.trainedDays} of ${targetDays} planned training days, including ${stats.strengthDays} with detailed strength exercises, and ${stats.restDays} of ${7-targetDays} rest days. ${stats.trainedDays>=targetDays?'You met your session count; see progression and recovery below.':stats.loggedDays<7?'Completed days without a workout or rest entry count as rest.':'Your logged training frequency was below plan.'}`);
 let cardio=stats.cardioMinutes<150?insightCopy(`سجلت ${fmt(stats.cardioMinutes)} دقيقة كارديو${stats.cardioTypes.length?' ('+stats.cardioTypes.map(tr).join('، ')+')':''}. زدها تدريجياً إذا كان تعافيك جيداً؛ اختَر نشاطاً مريحاً مثل المشي أو الدراجة أو السباحة.`,`You logged ${fmt(stats.cardioMinutes)} cardio minutes${stats.cardioTypes.length?' ('+stats.cardioTypes.map(tr).join(', ')+')':''}. Increase gradually if recovery is good; choose comfortable options such as walking, cycling or swimming.`):insightCopy(`سجلت ${fmt(stats.cardioMinutes)} دقيقة كارديو${stats.cardioTypes.length?' ('+stats.cardioTypes.map(tr).join('، ')+')':''}. حافظ على وتيرة تقدر تستمر عليها.`,`You logged ${fmt(stats.cardioMinutes)} cardio minutes${stats.cardioTypes.length?' ('+stats.cardioTypes.map(tr).join(', ')+')':''}. Keep a pace you can sustain.`);
 let weightAdvice,loss=null;
 const previousSaturday=insightSaturdayEntries(w.previousSaturday).weight;
 const hasAverages=current.readings.length>=2&&previous.readings.length>=2;
 const earlierReading=[...previous.readings].sort((a,b)=>b.date.localeCompare(a.date))[0];
 if(!hasAverages&&!previousSaturday){
  const currentValue=Number(saturday.weight.weight);
  const currentAverage=current.average;
  const summary=insightCopy(`سجلت ${fmt(current.readings.length)} قراءة من ${safe(w.weightStart)} إلى ${safe(w.saturday)}. متوسط هالأسبوع ${fmt(currentAverage)} كجم. وزن السبت ${fmt(currentValue)} كجم.`,`You logged ${fmt(current.readings.length)} readings from ${safe(w.weightStart)} to ${safe(w.saturday)}. This week’s average is ${fmt(currentAverage)} kg. Saturday’s weight is ${fmt(currentValue)} kg.`);
  if(earlierReading){
   const difference=Number((currentValue-Number(earlierReading.weight)).toFixed(1));
   const signed=(difference>0?'+':'')+fmt(difference);
   weightAdvice=summary+' '+insightCopy(`مقارنة بآخر قراءة من الفترة السابقة (${safe(earlierReading.date)}، ${fmt(earlierReading.weight)} كجم)، الفرق ${signed} كجم بين القراءتين. هذي مقارنة تقريبية، فما نقترح تخفيض أكلك بناءً عليها.`,`Compared with the last reading from the prior period (${safe(earlierReading.date)}, ${fmt(earlierReading.weight)} kg), the difference is ${signed} kg between readings. This is a rough comparison, so it does not justify cutting food intake.`);
  }else weightAdvice=summary+' '+insightCopy('الفترة السابقة ما فيها وزن محفوظ للمقارنة.','There is no saved weight in the previous period for comparison.');
 }

 else{
  loss=Number((hasAverages?previous.average-current.average:Number(previousSaturday.weight)-Number(saturday.weight.weight)).toFixed(3));const trend=`${(hasAverages?insightCopy('متوسط الوزن','Average weight'):insightCopy('وزن السبت (قراءتان فقط للمقارنة)','Saturday weight (two point readings)'))}: ${fmt(hasAverages?current.average:Number(saturday.weight.weight))} ${insightCopy('كجم؛ الفرق عن الفترة السابقة','kg; change from the previous period')}: ${loss>0?'-':'+'}${fmt(Math.abs(loss))} ${insightCopy('كجم.','kg.')}`;
  if(loss>=0.8&&loss<=1)weightAdvice=`${trend} ${insightCopy('قريب من هدفك الأسبوعي؛ إذا طاقتك وتعافيك زينين، استمر على نفس المقاومة والكارديو.','Close to your weekly goal; if energy and recovery are good, keep resistance and cardio steady.')}`;
  else if(loss>1)weightAdvice=`${trend} ${insightCopy('النزول تجاوز كيلو؛ ثبّت السعرات والكميات ولا ترفع الكارديو بهدف تسريع النزول. راقب الطاقة والتعافي.','Loss is faster than your target; do not increase the deficit or cardio now, and monitor energy and recovery.')}`;
  else if(loss>=0.35)weightAdvice=`${trend} ${insightCopy('فيه نزول واضح. ثبّت الروتين أسبوعاً آخر؛ لا نغيّر الحديد بسبب أسبوع واحد.','There is clear progress. Keep the routine for another week; do not change lifting based on one week.')}`;
  else if(changes.some(x=>(x.label==='محيط البطن'||x.label==='waist')&&x.delta<0))weightAdvice=`${trend} ${insightCopy('محيط البطن نزل أيضاً؛ استمر وراقب متوسط الوزن للفترة القادمة.','Waist measurement also decreased; continue and watch the next weight average.')}`;
  else if(food.adherence===null||food.adherence<0.7)weightAdvice=`${trend} ${insightCopy('التسجيل الغذائي غير مكتمل، لذلك ما أقدر أنسب بطء النزول للأكل. سجّل الوجبات أسبوعاً كاملاً قبل تعديل السعرات.','Food logging is incomplete, so I cannot attribute the slower trend to food. Log a full week before changing calories.')}`;
  else weightAdvice=`${trend} ${insightCopy('إذا تكرر الثبات في المراجعة القادمة مع تسجيل كامل، نقترح تغييراً صغيراً واحداً مثل زيادة كارديو معتدل 10 دقائق أسبوعياً؛ لا نخفّض أوزان الحديد لمجرد ثبات الميزان.','If the plateau repeats next review with complete logging, consider one small change, such as 10 extra minutes of moderate cardio per week; do not lower lifting weights just because the scale is stable.')}`;
 }
 let foodAdvice;
 if(!food.available)foodAdvice=insightCopy('ما فيه جدول وجبات معتمد يغطي هالفترة؛ ما أقدر أحكم على الأكل.','No approved meal plan covers this period, so food cannot be assessed.');
 else if(food.adherence<0.7||food.completeDays<2)foodAdvice=insightCopy(`علّمت ${fmt(food.checked)} من ${fmt(food.available)} وجبة مخططة (${fmt(food.adherence*100)}٪). التسجيل ناقص؛ علّم الوجبات اللي أكلتها وسجّل أي أكل خارج الجدول قبل ما نعدّل السعرات.`,`You checked ${fmt(food.checked)} of ${fmt(food.available)} planned meals (${fmt(food.adherence*100)}%). Logging is incomplete; check meals you ate and note food outside the plan before changing calories.`);
 else {const deviation=food.average-Number(state.profile.calories||0);foodAdvice=insightCopy(`علّمت ${fmt(food.checked)} من ${fmt(food.available)} وجبة (${fmt(food.adherence*100)}٪). مجموع سعرات الوجبات المؤشر عليها تقديري؛ متوسط الأيام اللي سجلت فيها كل وجبات الخطة ${fmt(food.average)} سعرة مقابل هدف ${fmt(state.profile.calories)}. ${Math.abs(deviation)<=200?'التزامك قريب من الهدف المبدئي؛ استمر وراقب الاتجاه.':deviation>200?'التقدير أعلى من الهدف؛ راجع كميات الحصص والزيوت أولاً.':'التقدير أقل من الهدف؛ تأكد من تسجيل كل الوجبات ولا تخفض أكلك أكثر دون حاجة.'} ما تشمل السعرات أي أكل غير مسجل.`,`You checked ${fmt(food.checked)} of ${fmt(food.available)} planned meals (${fmt(food.adherence*100)}%). Meal calories are estimates; the average on fully logged plan days is ${fmt(food.average)} kcal versus a ${fmt(state.profile.calories)} target. ${Math.abs(deviation)<=200?'That is close to the initial target; keep logging and watch the trend.':deviation>200?'The estimate is above target; review portions and added oils first.':'The estimate is below target; make sure all meals are logged and avoid reducing food further without a reason.'} Unlogged food is not included.`);}
 const measureText=changes.length?changes.map(x=>`${x.label}: ${x.delta>0?'+':''}${fmt(x.delta)} ${insightCopy('سم','cm')} (${safe(x.date)})`).join(' · '):insightCopy('ما فيه قياس سابق للمقارنة؛ سجّل القياس الجديد بنفس الظروف، ونقارن مع آخر قياس محفوظ.','No earlier measurement is available for comparison; log the new reading under similar conditions and we will compare it with the last saved measurement.');
 const mix=insightAlternativeExercises(w.currentStart,w.currentEnd);
 const target=insightCopy('هدف 1 كجم بالأسبوع هدفك، ونقارن متوسطات عدة قراءات؛ الموية وتوقيت الأكل يغيرون رقم الميزان مؤقتاً. التقييم يعتمد على اللي سجلته فقط، وسعرات الوجبات تقديرية ولا تحسب الأكل غير المسجل.','Your 1 kg weekly goal is used for comparison across multiple readings; water and meal timing can shift scale weight temporarily. This review uses logged data only, and meal calories are estimates that exclude unlogged food.');
 if(loss>1)cardio=insightCopy(`سجلت ${fmt(stats.cardioMinutes)} دقيقة كارديو. خلّ النشاط على مستواه الحالي إذا تعافيك زين.`,`You logged ${stats.cardioMinutes} minutes of cardio. Keep activity steady if you are recovering well.`);
 if(loss>1)foodAdvice+=' '+insightCopy('ثبت أكلك هذا الأسبوع. ما نقترح تخفيض السعرات بعد نزول فوق كيلو.','Keep intake steady this week. No calorie reduction is suggested after a loss above 1 kg.');
 return `<div class="card insight-weekly"><h3>${insightCopy('تحليل السبت','Saturday review')} · <bdi dir="ltr">${safe(w.saturday)}</bdi></h3><p class="hint">${priorMeasurement?insightCopy('لهذه المراجعة استخدمنا قياساتك المحفوظة بتاريخ ','This review uses your saved measurements from ')+safe(measurementDate)+'. ':''}${insightCopy('الأكل والتمرين لآخر ٧ أيام مكتملة إلى الجمعة، وتشمل المقارنة وزن وقياسات السبت.','Food and workouts cover seven completed days through Friday. Progress includes Saturday’s weigh-in and measurements.')} <bdi dir="ltr">${safe(w.currentStart)} — ${safe(w.currentEnd)}</bdi></p><h4>${insightCopy('التمرين','Training')}</h4><p>${strength}</p>${stats.inferredRestDays?`<p class="hint">${insightCopy('أيام محسوبة راحة لعدم وجود تسجيل','Days counted as rest without a log')}: ${fmt(stats.inferredRestDays)}</p>`:''}<p>${cardio}</p><p>${insightCopy('المجموعات المسجلة','Logged muscle groups')}: ${stats.groups.length?stats.groups.map(tr).join('، '):insightCopy('لا توجد','None')}</p>${mix}<h4>${insightCopy('الوزن والقياسات','Weight and measurements')}</h4><p>${weightAdvice}</p><p>${insightCopy('تغيّر القياسات','Measurement changes')}: ${measureText}</p><h4>${insightCopy('الأكل','Food')}</h4><p>${foodAdvice}</p><h4>${insightCopy('تقدم التمارين','Exercise progression')}</h4>${exerciseAdvice}<p class="hint">${target} <a href="https://www.cdc.gov/healthy-weight-growth/losing-weight/" target="_blank" rel="noopener">CDC</a> · <a href="https://acsm.org/resistance-training-guidelines-update-2026/" target="_blank" rel="noopener">ACSM</a> · <a href="https://www.who.int/initiatives/behealthy/physical-activity" target="_blank" rel="noopener">WHO</a></p></div>`;
}
function insightOpenMealPlan(key){selectedWeek=key;selectedMealDate=key;go('food');}
async function insightPrepareNextMealWeek(){
 const key=addDate(weekStart(dateNow()),7),saved=azmSavedFoodPreferences();
 if(getMealWeek(key)||!saved){insightOpenMealPlan(key);return;}
 const status=document.querySelector('[data-insight-plan-status]');
 if(await azmCreateWeeklyDraft(key,saved,status,false))insightOpenMealPlan(key);
}
function insightWeeklyMealPlan(){
 const key=addDate(weekStart(dateNow()),7),week=getMealWeek(key),end=addDate(key,6);
 if(!week)return `<div class="card insight-meal-plan"><h3>${insightCopy('جدول أكل الأسبوع القادم','Next week’s meal plan')} · <bdi dir="ltr">${safe(key)} — ${safe(end)}</bdi></h3><p>${insightCopy('جهّز مسودة الأسبوع القادم باستخدام تفضيلاتك وآخر سجلاتك.','Prepare next week’s draft using your preferences and recent logs.')}</p><p class="hint" role="status" data-insight-plan-status></p><button class="button" onclick="insightPrepareNextMealWeek()">${insightCopy('تجهيز مسودة ومراجعتها','Prepare and review a draft')}</button><p class="hint">${insightCopy('المسودة غير معتمدة ولا تُرسل للطباخ حتى تراجعها وتعتمدها.','The draft is not approved or sent to the cook until you review and approve it.')}</p></div>`;
 const status=week.status==='approved'?insightCopy('معتمد','Approved'):insightCopy('مسودة للمراجعة','Draft for review');
 const days=weekNames.map((name,i)=>{const date=addDate(key,i),source=azmSourceIndex(week,i),recipe=azmIsOpen(week,i)?'':week.days?.[source]?.recipe||'';return `<section class="insight-meal-day"><h4>${safe(tr(name))} · <bdi dir="ltr">${safe(date)}</bdi></h4>${datedMealRows(key,i,false)}${recipe?`<details><summary>${insightCopy('طريقة التحضير والتتبيلة','Cooking method and marinade')}</summary><p style="white-space:pre-wrap">${safe(tr(recipe))}</p></details>`:''}</section>`;}).join('');
 return `<div class="card insight-meal-plan"><div class="rowbetween"><h3>${insightCopy('جدول أكل الأسبوع القادم','Next week’s meal plan')} · <bdi dir="ltr">${safe(key)} — ${safe(end)}</bdi></h3><span class="tag">${status}</span></div><p>${week.status==='approved'?insightCopy('راجع الوجبات والكميات أدناه. بعد المراجعة افتح صفحة الغذاء لرسالة الطباخ الجاهزة في واتساب.','Review the meals and portions below. Then open the Food page to prepare the WhatsApp message for your cook.'):insightCopy('راجع الوجبات والكميات أدناه، وعدّل ما يحتاج تعديل في صفحة الغذاء ثم اعتمد الجدول لإتاحة رسالة الطباخ.','Review the meals and portions below. Edit anything needed in the Food page, then approve the plan to enable the cook’s message.')}</p>${days}<button class="button secondary" onclick="insightOpenMealPlan('${safe(key)}')">${insightCopy('فتح صفحة الغذاء للمراجعة والمشاركة','Open Food to review and share')}</button><p class="hint">${insightCopy('خطة المسودة المنسوخة تحتاج مراجعتك؛ التحليل لا يغيّر وجباتك تلقائياً.','A copied draft needs your review; the analysis does not change meals automatically.')}</p></div>`;
}
function insightTrainingAdvice(date,session){
 if(!session)return insightCopy('ما عندنا تسجيل تمرين أو راحة لهذا اليوم؛ سجّل الحالة حتى تكون المقارنة أدق.','No workout or rest was logged for this day. Record the status for a clearer comparison.');
 if(session.status==='rest')return insightCopy('الراحة جزء من الخطة. خل الحصة القادمة حسب تعافيك، وحافظ على تمارين المقاومة موزعة خلال الأسبوع.','Rest is part of the plan. Schedule the next session around recovery and spread resistance training across the week.');
 if(!(session.exercises||[]).length&&session.cardio>0)return insightCopy('سجلت كارديو فقط. لدعم الحفاظ على العضلات أثناء نزول الوزن، أضف تمارين مقاومة للمجموعات الرئيسية في حصصك الأسبوعية إذا كان ذلك مناسباً لك.','Only cardio is logged. To support muscle retention while losing weight, include resistance exercises for major muscle groups in your weekly sessions if appropriate for you.');
 if(session.pain)return insightCopy('سجلت ألماً أثناء التمرين. لا تكرر الحركة المؤلمة ولا تزد حملها قبل تقييمها.','Pain was logged during exercise. Do not repeat the painful movement or increase its load before it is assessed.');
 return insightCopy('سجّل أوزانك وتكراراتك، وحاول التقدم تدريجياً عندما تكون الحركة مريحة وأداؤك مضبوطاً. لا تحتاج للتمرين حتى الفشل في كل جولة.','Record weights and reps, and progress gradually when the movement feels comfortable and your form is controlled. You do not need to train to failure on every set.');
}
function insightDayCard(date){
 const food=insightMealData(date),session=state.training?.[date],weight=insightWeight(date),groups=(session?.groups||[]).map(tr).join('، '),cardioItems=session?cardioActivitiesFor(session):[],cardioNames=cardioItems.map(a=>tr(a.type)).join('، ');
 const exerciseCount=session?.exercises?.length||0;
 const foodShort=food.doneCount?`${fmt(food.doneCount)}/${fmt(food.rows.length)} ${insightCopy('وجبات','meals')} · ${fmt(food.logged)} ${insightCopy('سعرة','kcal')}`:insightCopy('الوجبات غير مسجلة','Meals not logged');
 const trainShort=session?.status==='rest'?insightCopy('راحة','Rest'):session?.status==='trained'?`${exerciseCount?insightCopy('مقاومة','Strength'):'تمرين'}${insightSessionCardio(session)?` · ${fmt(insightSessionCardio(session))} ${insightCopy('د كارديو','min cardio')}${cardioNames?' · '+safe(cardioNames):''}`:''}`:insightCopy('التمرين غير مسجل','Workout not logged');
 const weightShort=weight.current?`${fmt(weight.current.weight)} ${insightCopy('كجم','kg')}${weight.change!==null?` · ${weight.change>0?'+':''}${fmt(weight.change)}`:''}`:insightCopy('لا يوجد وزن','No weight');
 const foodAnalysis=food.isOpen?insightCopy('كان هذا اليوم مفتوحاً في الجدول؛ لا نحسبه كوجبات خطة.','This was an open-plan day; planned meals are not counted.'):food.rows.length?`${insightCopy('سجلت','Logged')} ${fmt(food.doneCount)} ${insightCopy('من','of')} ${fmt(food.rows.length)} ${insightCopy('وجبات الخطة. السعرات تقدير للوجبات المؤشر عليها فقط، ولا تشمل أي أكل غير مسجل.','planned meals. Calories are an estimate for checked meals only and exclude any unlogged food.')}${food.doneCount?` ${insightCopy('المجموع المقدر','Estimated total')}: ${fmt(food.logged)} ${insightCopy('سعرة.','kcal.')}`:''}${food.doneCount<food.rows.length?` ${insightCopy('الخطة الكاملة لهذا اليوم','The full plan for this day')}: ${fmt(food.planned)} ${insightCopy('سعرة تقريبية.','estimated kcal.')}`:''}`:insightCopy('ما عندنا وجبات مسجلة لهذا اليوم. علّم الوجبات المكتملة لتظهر السعرات التقديرية.','No meal plan is recorded for this day. Check completed meals to show estimated calories.');
 const trainingAnalysis=!session?insightCopy('محسوب راحة لأن ما فيه تسجيل تمرين أو راحة لهاليوم.','Counted as rest because this completed day has no workout or rest entry.'):session.status==='rest'?insightCopy('سجلت اليوم كراحة.','This day was logged as rest.'):`${insightCopy('سجلت','Logged')} ${fmt(exerciseCount)} ${insightCopy('تمارين،','recorded exercises,')} ${fmt(session.minutes||0)} ${insightCopy('دقيقة مقاومة','resistance minutes')}${insightSessionCardio(session)?` · ${fmt(insightSessionCardio(session))} ${insightCopy('دقيقة كارديو','cardio minutes')}${cardioNames?' ('+safe(cardioNames)+')':''}`:''}${groups?` · ${groups}`:''}.`;
 let weightAnalysis=weight.current?`${insightCopy('الوزن المسجل','Recorded weight')}: ${fmt(weight.current.weight)} ${insightCopy('كجم.','kg.')}${weight.change!==null?` ${insightCopy('الفرق عن آخر تسجيل','Change since last entry')}: ${weight.change>0?'+':''}${fmt(weight.change)} ${insightCopy('كجم. هذا فرق بين قياسين فقط ولا يحدد تغير الدهون.','kg. This is a difference between two readings and does not identify fat change.')}`:''}`:insightCopy('ما سجلت وزناً في هذا اليوم.','No weight was recorded on this day.');
 const advice=insightTrainingAdvice(date,session);
 return `<details class="daily-insight"><summary><strong>${safe(dateLabel(date))}</strong><span>${safe(foodShort)}</span><span>${safe(trainShort)}</span><span>${safe(weightShort)}</span><span class="insight-chevron">⌄</span></summary><div class="daily-insight-body"><section><h4>${insightCopy('الأكل','Food')}</h4><p>${foodAnalysis}</p><p class="hint">${insightCopy('قارن الوجبات المسجلة بالهدف اليومي المبدئي','Compare logged meals with your initial daily target')}: ${fmt(state.profile.calories)} ${insightCopy('سعرة.','kcal.')}</p></section><section><h4>${insightCopy('التمرين','Workout')}</h4><p>${trainingAnalysis}</p><p>${advice}</p></section><section><h4>${insightCopy('الوزن','Weight')}</h4><p>${weightAnalysis}</p><p class="hint">${insightCopy('قراءة يوم واحد تتأثر بالماء والطعام. تابع الاتجاه الأسبوعي بدل الحكم على نزول الدهون من تغير يومي.','A single reading is affected by water and food. Follow the weekly trend instead of judging fat loss from one day.')}</p></section></div></details>`;
}
function insightsPage(){
 const dates=insightDates();
 return `<div class="card insight-intro"><h3>${insightCopy('تحليلك اليومي والأسبوعي','Daily and weekly insights')}</h3><p>${insightCopy('التحليل اليومي يظهر بعد انتهاء اليوم. كل سبت، افتح هذا القسم لتحصل على مراجعة آخر 7 أيام مكتملة: الأكل المسجل، الوزن والقياسات، الحديد والكارديو، واقتراحات الاستمرار أو التعديل.','Daily insights appear after a day ends. Every Saturday, open this section for a review of the last 7 completed days: logged food, weight and measurements, strength and cardio, and suggestions to continue or adjust.')}</p><p class="hint">${insightCopy('التحليل يظهر عند فتح الصفحة؛ ما فيه تنبيه تلقائي بالخلفية. يعتمد على البيانات المسجلة فقط، والسعرات تقديرية ولا تشمل الأكل غير المسجل.','The review appears when you open the page; there is no background alert. It uses logged data only, and calorie values are estimates that exclude unlogged food.')}</p></div>${insightWeeklyCard()}${insightWeeklyMealPlan()}<div class="sectionHead"><h2>${insightCopy('سجل الأيام','Daily history')}</h2></div><div class="insight-list">${dates.map(insightDayCard).join('')||`<div class="card empty">${insightCopy('ما عندنا أيام مكتملة ببيانات كافية للحين. سجّل وجباتك وتمرينك ووزنك، وبيظهر التحليل بعد انتهاء اليوم.','There are no completed days with enough data yet. Log meals, workouts and weight, and the analysis will appear after the day ends.')}</div>`}</div>`;
}

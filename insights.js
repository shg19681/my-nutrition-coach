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
 return {week,rows,planned:rows.reduce((n,x)=>n+x.kcal,0),logged:rows.filter(x=>x.done).reduce((n,x)=>n+x.kcal,0),doneCount:rows.filter(x=>x.done).length,isOpen:week?.open===index};
}
function insightWeight(date){
 const weights=[...(state.weights||[])].sort((a,b)=>a.date.localeCompare(b.date));
 const current=weights.find(w=>w.date===date),previous=weights.filter(w=>w.date<date).at(-1);
 return {current,previous,change:current&&previous?Number((current.weight-previous.weight).toFixed(1)):null};
}
function insightWeekBounds(){
 const currentEnd=addDate(weekStart(dateNow()),-1),currentStart=addDate(currentEnd,-6),previousEnd=addDate(currentStart,-1),previousStart=addDate(previousEnd,-6);
 return {currentStart,currentEnd,previousStart,previousEnd};
}
function insightSessionCardio(s){return Array.isArray(s?.cardioActivities)?s.cardioActivities.reduce((n,a)=>n+(Number(a.minutes)||0),0):(Number(s?.cardio)||0);}
function insightWeeklyStats(start,end){
 const days=Array.from({length:7},(_,i)=>addDate(start,i)),sessions=days.map(d=>state.training?.[d]).filter(Boolean);
 return {strengthDays:days.filter(d=>(state.training?.[d]?.exercises||[]).length).length,cardioMinutes:sessions.reduce((n,s)=>n+insightSessionCardio(s),0),loggedDays:sessions.length};
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
function insightWeeklyCard(){
 const w=insightWeekBounds(),stats=insightWeeklyStats(w.currentStart,w.currentEnd),current=insightWeightAverage(w.currentStart,w.currentEnd),previous=insightWeightAverage(w.previousStart,w.previousEnd),changes=insightMeasurementChanges(w.currentStart,w.currentEnd,w.previousStart,w.previousEnd),exerciseAdvice=insightExerciseAdvice(w.currentStart,w.currentEnd);
 const strength=stats.strengthDays<2?insightCopy(`سجلت ${fmt(stats.strengthDays)} يوم مقاومة. إذا كان تسجيلك كاملاً، حاول توزيع حصتين مقاومة للمجموعات الرئيسية خلال الأسبوع.`,`You logged ${fmt(stats.strengthDays)} resistance days. If your log is complete, aim to spread two major-muscle-group sessions across the week.`):insightCopy(`سجلت ${fmt(stats.strengthDays)} أيام مقاومة؛ حافظ على توزيع الجلسات والتعافي.`,`You logged ${fmt(stats.strengthDays)} resistance days; keep sessions and recovery well spaced.`);
 const cardio=stats.cardioMinutes<150?insightCopy(`سجلت ${fmt(stats.cardioMinutes)} دقيقة كارديو من جميع الأنشطة. زِدها تدريجياً إذا كان تعافيك جيداً؛ الإرشاد العام يبدأ من 150 دقيقة نشاط متوسط أسبوعياً.`,`You logged ${fmt(stats.cardioMinutes)} cardio minutes across activities. Increase gradually if recovery is good; general guidance starts at 150 minutes of moderate activity per week.`):insightCopy(`سجلت ${fmt(stats.cardioMinutes)} دقيقة كارديو من جميع الأنشطة. راقب التعافي واستمر بوتيرة تقدر تحافظ عليها.`,`You logged ${fmt(stats.cardioMinutes)} cardio minutes across activities. Monitor recovery and keep a sustainable pace.`);
 let weightAdvice;
 if(current.readings.length<2||previous.readings.length<2)weightAdvice=insightCopy(`ما عندنا قياسات وزن كافية للمقارنة (المطلوب قراءتان على الأقل بكل أسبوع). سجّل الوزن بانتظام؛ ما راح أغيّر الروتين من قراءة واحدة.`,`There are not enough weight readings to compare (at least two per week are needed). Log weight regularly; one reading will not trigger a routine change.`);
 else{
  const loss=Number((previous.average-current.average).toFixed(1));
  const trend=`${insightCopy('متوسط الأسبوع','Weekly average')}: ${fmt(current.average)} ${insightCopy('كجم؛ التغيّر عن الأسبوع السابق','kg; change from previous week')}: ${loss>0?'-':'+'}${fmt(Math.abs(loss))} ${insightCopy('كجم','kg')}.`;
  if(loss>=0.8)weightAdvice=`${trend} ${insightCopy('وصلت تقريباً لهدفك الأسبوعي؛ خلّنا نثبت تمارين المقاومة والكارديو كما هي ونراقب الأسبوع القادم.','You are close to your weekly target; keep resistance and cardio routines as they are and review next week.')}`;
  else if(loss>=0.35)weightAdvice=`${trend} ${insightCopy('فيه نزول واضح، حتى لو أقل من كيلو. ثبّت الروتين أسبوعاً إضافياً؛ لا نغيّر الحديد بسبب أسبوع واحد.','There is clear progress, even if under 1 kg. Keep the routine for another week; do not change strength training based on one week.')}`;
  else if(changes.some(x=>x.label==='محيط البطن'&&x.delta<0||x.label==='waist'&&x.delta<0))weightAdvice=`${trend} ${insightCopy('محيط البطن نزل أيضاً؛ استمر على الروتين وراقب متوسط الوزن أسبوعاً آخر.','Waist measurement also decreased; keep the routine and watch the weight average for another week.')}`;
  else weightAdvice=`${trend} ${insightCopy('أسبوع واحد ما يكفي لتغيير الخطة. إذا تكرر الثبات أسبوعاً كاملاً آخر وكانت الوجبات مسجلة، نعدّل عاملاً واحداً تدريجياً مثل إضافة 10 دقائق كارديو بالأسبوع؛ لا نخفّض أوزان الحديد لمجرد نزول الميزان.','One week is not enough to change the plan. If the plateau repeats for another full week and meals are logged, adjust one factor gradually, such as adding 10 cardio minutes per week; do not lower lifting weights just to move the scale.')}`;
 }
 const measureText=changes.length?changes.map(x=>`${x.label}: ${x.delta>0?'+':''}${fmt(x.delta)} ${insightCopy('سم','cm')}`).join(' · '):insightCopy('ما فيه قياسات جسم قابلة للمقارنة بين الأسبوعين؛ قِس بنفس الظروف مرة بالأسبوع.','No matching body measurements were recorded across both weeks; measure under similar conditions once a week.');
 const target=insightCopy('هدف 1 كجم أسبوعياً قريب من الحد الأعلى؛ الإرشاد العام التدريجي يقارب 0.45–0.9 كجم أسبوعياً، والميزان يتأثر بالماء.','A 1 kg weekly goal is near the upper end; general gradual-loss guidance is about 0.45–0.9 kg per week, and scale weight is affected by water.');
 return `<div class="card insight-weekly"><h3>${insightCopy('مراجعة الأسبوع المكتمل','Completed week review')} · ${safe(w.currentStart)} — ${safe(w.currentEnd)}</h3><p>${strength}</p><p>${cardio}</p><p>${weightAdvice}</p><p>${insightCopy('تغيّر القياسات','Body measurement changes')}: ${measureText}</p><h4>${insightCopy('تقدم التمارين','Exercise progression')}</h4>${exerciseAdvice}<p class="hint">${target} <a href="https://www.cdc.gov/healthy-weight-growth/losing-weight/" target="_blank" rel="noopener">CDC</a> · <a href="https://acsm.org/resistance-training-guidelines-update-2026/" target="_blank" rel="noopener">ACSM</a> · <a href="https://www.who.int/initiatives/behealthy/physical-activity" target="_blank" rel="noopener">WHO</a></p></div>`;
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
 const trainingAnalysis=!session?insightCopy('ما تسجل تمرين أو راحة. ما نقدر نحكم إذا اليوم كان يوم تمرين أو تعافٍ.','No workout or rest was logged, so we cannot tell whether this was a training or recovery day.'):session.status==='rest'?insightCopy('سجلت اليوم كراحة.','This day was logged as rest.'):`${insightCopy('سجلت','Logged')} ${fmt(exerciseCount)} ${insightCopy('تمارين،','recorded exercises,')} ${fmt(session.minutes||0)} ${insightCopy('دقيقة مقاومة','resistance minutes')}${insightSessionCardio(session)?` · ${fmt(insightSessionCardio(session))} ${insightCopy('دقيقة كارديو','cardio minutes')}${cardioNames?' ('+safe(cardioNames)+')':''}`:''}${groups?` · ${groups}`:''}.`;
 let weightAnalysis=weight.current?`${insightCopy('الوزن المسجل','Recorded weight')}: ${fmt(weight.current.weight)} ${insightCopy('كجم.','kg.')}${weight.change!==null?` ${insightCopy('الفرق عن آخر تسجيل','Change since last entry')}: ${weight.change>0?'+':''}${fmt(weight.change)} ${insightCopy('كجم. هذا فرق بين قياسين فقط ولا يحدد تغير الدهون.','kg. This is a difference between two readings and does not identify fat change.')}`:''}`:insightCopy('ما سجلت وزناً في هذا اليوم.','No weight was recorded on this day.');
 const advice=insightTrainingAdvice(date,session);
 return `<details class="daily-insight"><summary><strong>${safe(dateLabel(date))}</strong><span>${safe(foodShort)}</span><span>${safe(trainShort)}</span><span>${safe(weightShort)}</span><span class="insight-chevron">⌄</span></summary><div class="daily-insight-body"><section><h4>${insightCopy('الأكل','Food')}</h4><p>${foodAnalysis}</p><p class="hint">${insightCopy('قارن الوجبات المسجلة بالهدف اليومي المبدئي','Compare logged meals with your initial daily target')}: ${fmt(state.profile.calories)} ${insightCopy('سعرة.','kcal.')}</p></section><section><h4>${insightCopy('التمرين','Workout')}</h4><p>${trainingAnalysis}</p><p>${advice}</p></section><section><h4>${insightCopy('الوزن','Weight')}</h4><p>${weightAnalysis}</p><p class="hint">${insightCopy('قراءة يوم واحد تتأثر بالماء والطعام. تابع الاتجاه الأسبوعي بدل الحكم على نزول الدهون من تغير يومي.','A single reading is affected by water and food. Follow the weekly trend instead of judging fat loss from one day.')}</p></section></div></details>`;
}
function insightsPage(){
 const dates=insightDates();
 return `<div class="card insight-intro"><h3>${insightCopy('تحليلك اليومي','Daily insights')}</h3><p>${insightCopy('يعرض التطبيق الأيام المكتملة قبل اليوم الحالي، ويجمع ما سجلته عن الوجبات والتمرين والوزن. تحليل اليوم يظهر بعد منتصف الليل بتوقيت الكويت عند فتح الصفحة.','This page shows completed days before today, using your logged meals, workouts and weight. Today’s analysis appears after midnight Kuwait time when you open the page.')}</p><p class="hint">${insightCopy('التقييم مبني على البيانات المسجلة فقط؛ الوجبات غير المؤشر عليها أو التمارين غير المسجلة ما تدخل بالحساب.','Analysis uses logged data only; unchecked meals and unlogged workouts are not counted.')}</p></div>${insightWeeklyCard()}<div class="sectionHead"><h2>${insightCopy('سجل الأيام','Daily history')}</h2></div><div class="insight-list">${dates.map(insightDayCard).join('')||`<div class="card empty">${insightCopy('ما عندنا أيام مكتملة ببيانات كافية للحين. سجّل وجباتك وتمرينك ووزنك، وبيظهر التحليل بعد انتهاء اليوم.','There are no completed days with enough data yet. Log meals, workouts and weight, and the analysis will appear after the day ends.')}</div>`}</div>`;
}

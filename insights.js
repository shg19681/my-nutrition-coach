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
function insightWeeklyStats(endDate){
 const start=addDate(endDate,-6),days=Array.from({length:7},(_,i)=>addDate(start,i));
 const sessions=days.map(d=>state.training?.[d]).filter(Boolean);
 return {strengthDays:new Set(days.filter(d=>(state.training?.[d]?.exercises||[]).length).map(d=>d)).size,cardioMinutes:sessions.reduce((n,s)=>n+(Number(s.cardio)||0),0)};
}
function insightWeightTrend(endDate){
 const currentStart=addDate(endDate,-6),previousEnd=addDate(currentStart,-1),previousStart=addDate(previousEnd,-6);
 const current=(state.weights||[]).filter(w=>w.date>=currentStart&&w.date<=endDate),previous=(state.weights||[]).filter(w=>w.date>=previousStart&&w.date<=previousEnd);
 if(current.length<2||previous.length<2)return insightCopy('سجّل الوزن بانتظام حتى نقارن متوسط أسبوع بأسبوع؛ فرق يوم واحد يتأثر بالماء والطعام.','Log weight regularly so we can compare weekly averages; a one-day change is affected by water and food.');
 const average=a=>a.reduce((n,w)=>n+Number(w.weight),0)/a.length,delta=Number((average(current)-average(previous)).toFixed(1));
 const direction=Math.abs(delta)<0.15?insightCopy('متوسط الوزن قريب من الثبات','the average is nearly stable'):delta<0?insightCopy('متوسط الوزن أقل','the average is lower'):insightCopy('متوسط الوزن أعلى','the average is higher');
 return `${direction} ${fmt(Math.abs(delta))} ${insightCopy('كجم','kg')} ${insightCopy('مقارنة بالأسبوع السابق','compared with the previous week')} (${fmt(current.length)} ${insightCopy('قياسات','readings')} / ${fmt(previous.length)}).`;
}
function insightWeeklyCard(){
 const end=addDate(dateNow(),-1),stats=insightWeeklyStats(end),trend=insightWeightTrend(end);
 const strength=stats.strengthDays<2?insightCopy('سجّل أقل من يومي مقاومة في آخر أسبوع مكتمل. إذا كان السجل كاملًا، أضف حصتين مقاومة للمجموعات الرئيسية موزعتين على الأسبوع.','Fewer than two resistance days are logged in the last complete week. If the log is complete, add two sessions for the major muscle groups across the week.'):insightCopy('سجلت يومي مقاومة أو أكثر في آخر أسبوع مكتمل.','Two or more resistance days are logged in the last complete week.');
 const cardio=stats.cardioMinutes<150?insightCopy(`سجلت ${fmt(stats.cardioMinutes)} دقيقة كارديو. زِدها تدريجياً حسب قدرتك باتجاه 150 دقيقة نشاط متوسط أسبوعياً؛ مو لازم توصل للهدف دفعة واحدة.`,`You logged ${fmt(stats.cardioMinutes)} cardio minutes. Gradually add activity as able toward 150 minutes of moderate activity per week; there is no need to reach the target at once.`):insightCopy(`سجلت ${fmt(stats.cardioMinutes)} دقيقة كارديو. راقب الشدة والتعافي واستمر على وتيرة تقدر تحافظ عليها.`,`You logged ${fmt(stats.cardioMinutes)} cardio minutes. Keep an eye on intensity and recovery, and stay at a sustainable pace.`);
 return `<div class="card insight-weekly"><h3>${insightCopy('نظرة الأسبوع المكتمل','Last complete week')}</h3><p>${strength}</p><p>${cardio}</p><p class="hint">${trend}</p><p class="hint">${insightCopy('إرشاد عام للبالغين: 150–300 دقيقة نشاط متوسط أسبوعياً، وتقوية العضلات الرئيسية يومين أو أكثر.','General adult guidance: 150–300 minutes of moderate activity per week, and muscle strengthening on two or more days.')} <a href="https://www.who.int/initiatives/behealthy/physical-activity" target="_blank" rel="noopener">WHO</a> · <a href="https://acsm.org/resistance-training-guidelines-update-2026/" target="_blank" rel="noopener">ACSM</a></p></div>`;
}
function insightTrainingAdvice(date,session){
 if(!session)return insightCopy('ما عندنا تسجيل تمرين أو راحة لهذا اليوم؛ سجّل الحالة حتى تكون المقارنة أدق.','No workout or rest was logged for this day. Record the status for a clearer comparison.');
 if(session.status==='rest')return insightCopy('الراحة جزء من الخطة. خل الحصة القادمة حسب تعافيك، وحافظ على تمارين المقاومة موزعة خلال الأسبوع.','Rest is part of the plan. Schedule the next session around recovery and spread resistance training across the week.');
 if(!(session.exercises||[]).length&&session.cardio>0)return insightCopy('سجلت كارديو فقط. لدعم الحفاظ على العضلات أثناء نزول الوزن، أضف تمارين مقاومة للمجموعات الرئيسية في حصصك الأسبوعية إذا كان ذلك مناسباً لك.','Only cardio is logged. To support muscle retention while losing weight, include resistance exercises for major muscle groups in your weekly sessions if appropriate for you.');
 if(session.pain)return insightCopy('سجلت ألماً أثناء التمرين. لا تكرر الحركة المؤلمة ولا تزد حملها قبل تقييمها.','Pain was logged during exercise. Do not repeat the painful movement or increase its load before it is assessed.');
 return insightCopy('سجّل أوزانك وتكراراتك، وحاول التقدم تدريجياً عندما تكون الحركة مريحة وأداؤك مضبوطاً. لا تحتاج للتمرين حتى الفشل في كل جولة.','Record weights and reps, and progress gradually when the movement feels comfortable and your form is controlled. You do not need to train to failure on every set.');
}
function insightDayCard(date){
 const food=insightMealData(date),session=state.training?.[date],weight=insightWeight(date),groups=(session?.groups||[]).map(tr).join('، ');
 const exerciseCount=session?.exercises?.length||0;
 const foodShort=food.doneCount?`${fmt(food.doneCount)}/${fmt(food.rows.length)} ${insightCopy('وجبات','meals')} · ${fmt(food.logged)} ${insightCopy('سعرة','kcal')}`:insightCopy('الوجبات غير مسجلة','Meals not logged');
 const trainShort=session?.status==='rest'?insightCopy('راحة','Rest'):session?.status==='trained'?`${exerciseCount?insightCopy('مقاومة','Strength'):'تمرين'}${session.cardio?` · ${fmt(session.cardio)} ${insightCopy('د كارديو','min cardio')}`:''}`:insightCopy('التمرين غير مسجل','Workout not logged');
 const weightShort=weight.current?`${fmt(weight.current.weight)} ${insightCopy('كجم','kg')}${weight.change!==null?` · ${weight.change>0?'+':''}${fmt(weight.change)}`:''}`:insightCopy('لا يوجد وزن','No weight');
 const foodAnalysis=food.isOpen?insightCopy('كان هذا اليوم مفتوحاً في الجدول؛ لا نحسبه كوجبات خطة.','This was an open-plan day; planned meals are not counted.'):food.rows.length?`${insightCopy('سجلت','Logged')} ${fmt(food.doneCount)} ${insightCopy('من','of')} ${fmt(food.rows.length)} ${insightCopy('وجبات الخطة. السعرات تقدير للوجبات المؤشر عليها فقط، ولا تشمل أي أكل غير مسجل.','planned meals. Calories are an estimate for checked meals only and exclude any unlogged food.')}${food.doneCount?` ${insightCopy('المجموع المقدر','Estimated total')}: ${fmt(food.logged)} ${insightCopy('سعرة.','kcal.')}`:''}${food.doneCount<food.rows.length?` ${insightCopy('الخطة الكاملة لهذا اليوم','The full plan for this day')}: ${fmt(food.planned)} ${insightCopy('سعرة تقريبية.','estimated kcal.')}`:''}`:insightCopy('ما عندنا وجبات مسجلة لهذا اليوم. علّم الوجبات المكتملة لتظهر السعرات التقديرية.','No meal plan is recorded for this day. Check completed meals to show estimated calories.');
 const trainingAnalysis=!session?insightCopy('ما تسجل تمرين أو راحة. ما نقدر نحكم إذا اليوم كان يوم تمرين أو تعافٍ.','No workout or rest was logged, so we cannot tell whether this was a training or recovery day.'):session.status==='rest'?insightCopy('سجلت اليوم كراحة.','This day was logged as rest.'):`${insightCopy('سجلت','Logged')} ${fmt(exerciseCount)} ${insightCopy('تمارين،','recorded exercises,')} ${fmt(session.minutes||0)} ${insightCopy('دقيقة مقاومة','resistance minutes')}${session.cardio?` · ${fmt(session.cardio)} ${insightCopy('دقيقة كارديو','cardio minutes')}`:''}${groups?` · ${groups}`:''}.`;
 let weightAnalysis=weight.current?`${insightCopy('الوزن المسجل','Recorded weight')}: ${fmt(weight.current.weight)} ${insightCopy('كجم.','kg.')}${weight.change!==null?` ${insightCopy('الفرق عن آخر تسجيل','Change since last entry')}: ${weight.change>0?'+':''}${fmt(weight.change)} ${insightCopy('كجم. هذا فرق بين قياسين فقط ولا يحدد تغير الدهون.','kg. This is a difference between two readings and does not identify fat change.')}`:''}`:insightCopy('ما سجلت وزناً في هذا اليوم.','No weight was recorded on this day.');
 const advice=insightTrainingAdvice(date,session);
 return `<details class="daily-insight"><summary><strong>${safe(dateLabel(date))}</strong><span>${safe(foodShort)}</span><span>${safe(trainShort)}</span><span>${safe(weightShort)}</span><span class="insight-chevron">⌄</span></summary><div class="daily-insight-body"><section><h4>${insightCopy('الأكل','Food')}</h4><p>${foodAnalysis}</p><p class="hint">${insightCopy('قارن الوجبات المسجلة بالهدف اليومي المبدئي','Compare logged meals with your initial daily target')}: ${fmt(state.profile.calories)} ${insightCopy('سعرة.','kcal.')}</p></section><section><h4>${insightCopy('التمرين','Workout')}</h4><p>${trainingAnalysis}</p><p>${advice}</p></section><section><h4>${insightCopy('الوزن','Weight')}</h4><p>${weightAnalysis}</p><p class="hint">${insightCopy('قراءة يوم واحد تتأثر بالماء والطعام. تابع الاتجاه الأسبوعي بدل الحكم على نزول الدهون من تغير يومي.','A single reading is affected by water and food. Follow the weekly trend instead of judging fat loss from one day.')}</p></section></div></details>`;
}
function insightsPage(){
 const dates=insightDates();
 return `<div class="card insight-intro"><h3>${insightCopy('تحليلك اليومي','Daily insights')}</h3><p>${insightCopy('يعرض التطبيق الأيام المكتملة قبل اليوم الحالي، ويجمع ما سجلته عن الوجبات والتمرين والوزن. تحليل اليوم يظهر بعد منتصف الليل بتوقيت الكويت عند فتح الصفحة.','This page shows completed days before today, using your logged meals, workouts and weight. Today’s analysis appears after midnight Kuwait time when you open the page.')}</p><p class="hint">${insightCopy('التقييم مبني على البيانات المسجلة فقط؛ الوجبات غير المؤشر عليها أو التمارين غير المسجلة ما تدخل بالحساب.','Analysis uses logged data only; unchecked meals and unlogged workouts are not counted.')}</p></div>${insightWeeklyCard()}<div class="sectionHead"><h2>${insightCopy('سجل الأيام','Daily history')}</h2></div><div class="insight-list">${dates.map(insightDayCard).join('')||`<div class="card empty">${insightCopy('ما عندنا أيام مكتملة ببيانات كافية للحين. سجّل وجباتك وتمرينك ووزنك، وبيظهر التحليل بعد انتهاء اليوم.','There are no completed days with enough data yet. Log meals, workouts and weight, and the analysis will appear after the day ends.')}</div>`}</div>`;
}

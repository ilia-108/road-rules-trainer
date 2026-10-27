type ReviewRun = {
 id:number;
 kind:'full'|'new';
 wrong:number;
 completed_at:string|null;
 review?:{completed_at:string|null};
};

// Reviews belong to a particular run. A fresh full repeat starts a new cycle.
export function topicReviewState<T extends ReviewRun>(runs:T[]) {
 const full=runs.find(run=>run.kind==='full');
 const failed=runs.filter(run=>run.id>=(full?.id??0)&&run.completed_at&&run.wrong>0);
 const pending=failed.find(run=>run.review&&!run.review.completed_at)??failed.find(run=>!run.review);
 return {pending,completed:failed.length>0&&failed.every(run=>Boolean(run.review?.completed_at))};
}

type ContinuationProgress={remaining:number;new_count:number;total:number;answered:number;next_question:number};
const questionForms=new Intl.PluralRules('ru');
const questions=(count:number)=>`${count} ${questionForms.select(count)==='one'?'вопрос':questionForms.select(count)==='few'?'вопроса':'вопросов'}`;

export function topicContinuation(progress:ContinuationProgress) {
 const existing=Math.max(0,progress.remaining);
 const added=Math.max(0,progress.new_count);
 const remaining=existing+added;
 if(!remaining)return {
  target:'saved' as const,
  label:'Тема пройдена',
  tooltip:`Вы ответили на все ${questions(progress.total)}. Можно посмотреть сохранённые ответы. Повторное прохождение запускается отдельно.`,
 };
 if(!existing&&added)return {
  target:'new' as const,
  label:'Тема пройдена · появились новые вопросы',
  tooltip:`Вы уже прошли эту тему. Появилось ${questions(added)}. «Продолжить тему» откроет только новые вопросы; предыдущие результаты сохранятся.`,
 };
 return {
  target:'main' as const,
  label:added?`Осталось ${remaining} из ${progress.total}, из них ${added} новых`:`Осталось ${questions(remaining)} из ${progress.total}`,
  tooltip:`Не отвечено: ${questions(remaining)} из ${progress.total}. Продолжение с вопроса ${progress.next_question}; отвеченные вопросы пропускаются.${added?` Сначала оставшиеся вопросы основного прохождения (${existing}), затем новые (${added}) — отдельным набором с сохранением статистики.`:''}`,
 };
}

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

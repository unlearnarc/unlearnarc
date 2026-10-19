package com.unlearnarc.dailyquiz;
import com.unlearnarc.common.ApiResponse;
import com.unlearnarc.dailyquiz.DailyQuizModels.*;
import com.unlearnarc.quspool.entity.QuestionPool;
import jakarta.persistence.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController @RequestMapping("/api/v1/daily-quiz/admin") @PreAuthorize("hasRole('ADMIN')") @RequiredArgsConstructor
public class DailyQuizAdminController {
    private final EntityManager em;
    private final DailyPoolPolicyRepository policies;
    @GetMapping("/quality") @Transactional(readOnly=true)
    public ApiResponse<List<Quality>> quality(){
        List<Object[]> counts=em.createQuery("select q.poolId,count(q.id),sum(case when q.explanation is null or q.explanation='' then 1 else 0 end) from Question q where q.isActive=true group by q.poolId",Object[].class).getResultList();
        Map<String,Object[]> byPool=new HashMap<>();counts.forEach(c->byPool.put((String)c[0],c));
        List<Object[]> mappings=em.createQuery("select m.poolId,count(m.id) from TopicPoolMapping m group by m.poolId",Object[].class).getResultList();
        Map<String,Long> topicCounts=new HashMap<>();mappings.forEach(m->topicCounts.put((String)m[0],(Long)m[1]));
        List<Object[]> invalid=em.createQuery("""
            select q.poolId,count(q.id) from Question q where q.isActive=true and
            ((select count(a.id) from Answer a where a.questionId=q.id)<2
             or (q.questionType=com.unlearnarc.quspool.entity.Question.QuestionType.MCQ and (select count(a.id) from Answer a where a.questionId=q.id and a.isCorrect=true)<>1)
             or (q.questionType=com.unlearnarc.quspool.entity.Question.QuestionType.MULTIPLE_CORRECT and (select count(a.id) from Answer a where a.questionId=q.id and a.isCorrect=true)<2)) group by q.poolId
            """,Object[].class).getResultList();
        Map<String,Long> invalidCounts=new HashMap<>();invalid.forEach(m->invalidCounts.put((String)m[0],(Long)m[1]));
        Map<String,DailyPoolPolicy> ps=new HashMap<>();policies.findAll().forEach(p->ps.put(p.getPoolId(),p));
        var rows=em.createQuery("select p from QuestionPool p order by p.name,p.id",QuestionPool.class).getResultList().stream().map(p->{
            Object[] c=byPool.get(p.getId());DailyPoolPolicy policy=ps.get(p.getId());
            return new Quality(p.getId(),p.getName(),c==null?0:(Long)c[1],c==null?0:(Long)c[2],invalidCounts.getOrDefault(p.getId(),0L),topicCounts.getOrDefault(p.getId(),0L),policy!=null&&policy.isGeneralDiagnostic(),policy!=null&&policy.isIntroductory());
        }).toList();return ApiResponse.ok(rows,"Daily question-bank quality fetched");
    }
    @PutMapping("/pools/{id}") @Transactional
    public ApiResponse<Void> policy(@PathVariable String id,@RequestBody PolicyRequest request){
        QuestionPool pool=em.find(QuestionPool.class,id);if(pool==null)throw new EntityNotFoundException("Pool unavailable");
        long mappings=em.createQuery("select count(m) from TopicPoolMapping m where m.poolId=:id",Long.class).setParameter("id",id).getSingleResult();
        if((request.generalDiagnostic()||request.introductory())&&mappings!=1)throw new IllegalArgumentException("Diagnostic pools require exactly one verified topic mapping");
        DailyPoolPolicy p=policies.findById(id).orElseGet(DailyPoolPolicy::new);p.setPoolId(id);p.setGeneralDiagnostic(request.generalDiagnostic());p.setIntroductory(request.introductory());policies.save(p);
        return ApiResponse.ok(null,"Daily pool eligibility updated");
    }
}

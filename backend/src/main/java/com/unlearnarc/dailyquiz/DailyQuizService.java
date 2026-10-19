package com.unlearnarc.dailyquiz;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.unlearnarc.dailyquiz.DailyQuizModels.*;
import com.unlearnarc.dailyquiz.DailyQuizRules.*;
import com.unlearnarc.quspool.entity.*;
import com.unlearnarc.user.entity.User;
import com.unlearnarc.user.repository.UserRepository;
import com.unlearnarc.user.service.StreakService;
import com.unlearnarc.studyplan.StudyPlanRepository;
import jakarta.persistence.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.*;
import java.util.*;

@Service @RequiredArgsConstructor @Transactional
public class DailyQuizService {
    private final UserRepository users;
    private final DailySessionRepository sessions;
    private final DailyItemRepository items;
    private final DailyLearningProfile profiles;
    private final DailyQuizRules rules;
    private final StudyPlanRepository plans;
    private final StreakService streaks;
    private final EntityManager em;
    private final ObjectMapper json;
    private final Clock clock;
    private User owner(String email) {
        User u=users.findByEmail(email).filter(x->Boolean.TRUE.equals(x.getIsActive())).orElseThrow(()->new EntityNotFoundException("Student unavailable"));
        return users.lockForContestScoring(u.getId()).orElseThrow();
    }
    private ZoneId zone(String user) {
        String name=plans.findByUserId(user).map(p->p.getTimeZone()).orElse(rules.getDefaultTimeZone());
        try{return ZoneId.of(name);}catch(DateTimeException e){return ZoneOffset.UTC;}
    }
    private DailySession owned(String user,String id){return sessions.findById(id).filter(s->s.getUserId().equals(user)).orElseThrow(()->new EntityNotFoundException("Daily quiz unavailable"));}
    public SessionView today(String email,boolean generate) {
        User u=owner(email); ZoneId zone=zone(u.getId()); LocalDate date=LocalDate.now(clock.withZone(zone));
        DailySession s=sessions.findByUserIdAndLearningDate(u.getId(),date).orElse(null);
        if(s!=null) return view(s);
        if(!generate) return null;
        var profile=profiles.load(u.getId(),date,zone);
        // Batch options once; malformed keys are excluded before allocation.
        List<Answer> answers=profile.questions().isEmpty()?List.of():em.createQuery("select a from Answer a where a.questionId in :ids order by a.displayOrder,a.id",Answer.class)
            .setParameter("ids",profile.questions().keySet()).getResultList();
        Map<String,List<KeyOption>> options=new HashMap<>();
        answers.forEach(a->options.computeIfAbsent(a.getQuestionId(),k->new ArrayList<>()).add(new KeyOption(a.getId(),a.getAnswerText(),Boolean.TRUE.equals(a.getIsCorrect()))));
        var eligible=profile.candidates().stream().filter(c->{
            Question q=profile.questions().get(c.id()); List<KeyOption> os=options.getOrDefault(c.id(),List.of()); long correct=os.stream().filter(KeyOption::correct).count();
            return os.size()>=2 && os.stream().allMatch(o->o.text()!=null&&!o.text().isBlank()) && q.getQuestionText()!=null && !q.getQuestionText().isBlank()
                && (q.getQuestionType()==Question.QuestionType.MCQ ? correct==1 : q.getQuestionType()==Question.QuestionType.MULTIPLE_CORRECT && correct>=2);
        }).toList();
        int budget=plans.findByUserId(u.getId()).map(p->Math.max(1,p.getDailyMinutes()*2/3)).orElse(rules.getTargetCount());
        var picks=rules.select(eligible,profile.evidence(),profile.learned(),date,zone,budget);
        List<String> notices=new ArrayList<>(profile.notices());
        if(picks.isEmpty()) notices.add("No eligible questions are available. Explore or enroll in a course and study an introductory lesson.");
        if(!picks.isEmpty() && picks.size()<rules.getMinimumUsefulSize()) notices.add("This short practice does not cover your overall knowledge.");
        if(picks.size()<Math.min(rules.getTargetCount(),budget)) notices.add("The quiz is shorter because the appropriate distinct question pool is limited.");
        if(picks.stream().anyMatch(Pick::repeated)) notices.add("A limited question bank means you may encounter a question you have seen before.");
        if(picks.stream().anyMatch(Pick::relaxedDifficulty)) notices.add("Difficulty preferences were adjusted to the available question bank.");
        for(var e:profile.evidence().values()) if((e.state()==State.NEEDS_FOUNDATION||e.state()==State.NEEDS_PRACTICE) && eligible.stream().noneMatch(c->c.topic().equals(e.topic())))
            notices.add("Practice questions are unavailable for "+profile.topics().get(e.topic()).name()+". Revisit its lesson from Learning insights.");
        s=new DailySession(); s.setUserId(u.getId());s.setLearningDate(date);s.setTimeZone(zone.getId());s.setGeneratedAt(clock.instant());s.setNotices(write(notices));sessions.saveAndFlush(s);
        int position=0;
        for(Pick p:picks){Question q=profile.questions().get(p.question().id());var topic=profile.topics().get(p.question().topic());
            DailyItem i=new DailyItem();i.setSessionId(s.getId());i.setUserId(u.getId());i.setQuestionId(q.getId());i.setPosition(position++);
            i.setTopicId(topic.id());i.setTopicName(topic.name());i.setCourseId(topic.course());i.setReason(p.reason().name());i.setDifficulty(q.getDifficulty().name());i.setQuestionType(q.getQuestionType().name());
            i.setQuestionText(q.getQuestionText());i.setOptionsJson(write(options.get(q.getId())));i.setExplanation(q.getExplanation());i.setExposedAt(clock.instant());items.save(i);
        }
        items.flush();return view(s);
    }
    public SessionView get(String email,String id){return view(owned(owner(email).getId(),id));}
    public Page<SessionView> history(String email,int page){return sessions.findByUserIdOrderByLearningDateDesc(owner(email).getId(),PageRequest.of(Math.max(0,page),10)).map(this::view);}
    public SessionView start(String email,String id){DailySession s=owned(owner(email).getId(),id);if(s.getStatus().equals("GENERATED")){s.setStatus("IN_PROGRESS");s.setStartedAt(clock.instant());}return view(s);}
    public SessionView answer(String email,String session,String item,Set<String> selected){
        User u=owner(email);DailySession s=owned(u.getId(),session);
        DailyItem i=items.findById(item).filter(x->x.getSessionId().equals(s.getId())).orElseThrow(()->new EntityNotFoundException("Question unavailable"));
        if(i.getAnsweredAt()!=null){if(!readSet(i.getSelectedJson()).equals(selected))throw new IllegalStateException("This question already has a different submitted answer");return view(s);}
        if(!Set.of("GENERATED","IN_PROGRESS").contains(s.getStatus()))throw new IllegalStateException("This quiz is no longer accepting answers");
        List<KeyOption> os=options(i);Set<String> allowed=new HashSet<>(),key=new HashSet<>();os.forEach(o->{allowed.add(o.id());if(o.correct())key.add(o.id());});
        if(selected==null||selected.isEmpty()||!allowed.containsAll(selected)||i.getQuestionType().equals("MCQ")&&selected.size()!=1)throw new IllegalArgumentException("Select valid answer options");
        if(s.getStartedAt()==null)s.setStartedAt(clock.instant());s.setStatus("IN_PROGRESS");
        i.setSelectedJson(write(new TreeSet<>(selected)));i.setCorrect(com.unlearnarc.quspool.service.ChoiceAnswerEvaluator.correct(Question.QuestionType.valueOf(i.getQuestionType()),key,selected));i.setAnsweredAt(clock.instant());items.flush();
        return view(s);
    }
    public SessionView complete(String email,String id){
        User u=owner(email);DailySession s=owned(u.getId(),id);if(s.getStatus().equals("COMPLETED"))return view(s);
        List<DailyItem> qs=items.findBySessionIdOrderByPosition(id);
        if(!Set.of("GENERATED","IN_PROGRESS").contains(s.getStatus())||qs.isEmpty()||qs.stream().anyMatch(i->i.getAnsweredAt()==null))throw new IllegalStateException("Answer every question before completing the quiz");
        s.setStatus("COMPLETED");s.setSubmittedAt(clock.instant());streaks.recordActivity(u.getId());return view(s);
    }
    public List<Insight> insights(String email,boolean revisions){User u=owner(email);ZoneId z=zone(u.getId());var p=profiles.load(u.getId(),LocalDate.now(clock.withZone(z)),z);
        return p.topics().values().stream().sorted(Comparator.comparing(DailyLearningProfile.TopicInfo::id)).filter(t->!revisions||p.evidence().get(t.id()).nextReview()!=null)
            .map(t->new Insight(t.id(),t.name(),href(t.course(),t.id()),p.evidence().get(t.id()),DailyQuizRules.explanation(rules.reason(p.evidence().get(t.id()),p.learned().contains(t.id()))))).toList();}
    private String href(String course,String topic){return course==null?null:"/courses/"+course+"?topic="+topic;}
    private SessionView view(DailySession s){List<DailyItem> qs=items.findBySessionIdOrderByPosition(s.getId());List<ItemView> views=qs.stream().map(i->{
        boolean answered=i.getAnsweredAt()!=null;Set<String> key=new TreeSet<>();List<KeyOption> os=options(i);if(answered)os.stream().filter(KeyOption::correct).forEach(o->key.add(o.id()));
        return new ItemView(i.getId(),i.getQuestionId(),i.getTopicId(),i.getTopicName(),href(i.getCourseId(),i.getTopicId()),i.getReason(),DailyQuizRules.explanation(Reason.valueOf(i.getReason())),i.getDifficulty(),i.getQuestionType(),i.getQuestionText(),os.stream().map(o->new Option(o.id(),o.text())).toList(),answered?readSet(i.getSelectedJson()):Set.of(),answered?i.getCorrect():null,answered?i.getExplanation():null,answered?key:null);
    }).toList();return new SessionView(s.getId(),s.getLearningDate(),s.getTimeZone(),s.getStatus(),s.getRuleVersion(),s.getGeneratedAt(),s.getStartedAt(),s.getSubmittedAt(),(int)qs.stream().filter(i->Boolean.TRUE.equals(i.getCorrect())).count(),(int)qs.stream().filter(i->Boolean.FALSE.equals(i.getCorrect())).count(),views,read(s.getNotices(),new TypeReference<List<String>>(){}));}
    private List<KeyOption> options(DailyItem i){return read(i.getOptionsJson(),new TypeReference<List<KeyOption>>(){});}
    private Set<String> readSet(String value){return read(value,new TypeReference<Set<String>>(){});}
    private <T>T read(String value,TypeReference<T> type){try{return json.readValue(value,type);}catch(Exception e){throw new IllegalStateException("Saved quiz data is unavailable");}}
    private String write(Object value){try{return json.writeValueAsString(value);}catch(Exception e){throw new IllegalStateException("Could not save quiz data");}}
}

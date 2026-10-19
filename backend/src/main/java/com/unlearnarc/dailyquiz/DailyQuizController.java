package com.unlearnarc.dailyquiz;
import com.unlearnarc.common.ApiResponse;
import com.unlearnarc.dailyquiz.DailyQuizModels.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.data.domain.Page;
import java.util.List;
@RestController @RequestMapping("/api/v1/daily-quiz") @PreAuthorize("hasRole('USER')") @RequiredArgsConstructor
public class DailyQuizController {
    private final DailyQuizService service;
    @GetMapping("/today") public ApiResponse<SessionView> today(Authentication a){return ApiResponse.ok(service.today(a.getName(),false),"Today's quiz fetched");}
    @PostMapping("/today") public ApiResponse<SessionView> generate(Authentication a){return ApiResponse.ok(service.today(a.getName(),true),"Today's quiz ready");}
    @GetMapping("/sessions/{id}") public ApiResponse<SessionView> get(Authentication a,@PathVariable String id){return ApiResponse.ok(service.get(a.getName(),id),"Quiz fetched");}
    @PostMapping("/sessions/{id}/start") public ApiResponse<SessionView> start(Authentication a,@PathVariable String id){return ApiResponse.ok(service.start(a.getName(),id),"Quiz resumed");}
    @PostMapping("/sessions/{id}/answers/{item}") public ApiResponse<SessionView> answer(Authentication a,@PathVariable String id,@PathVariable String item,@Valid @RequestBody AnswerRequest body){return ApiResponse.ok(service.answer(a.getName(),id,item,body.selectedAnswerIds()),"Answer recorded");}
    @PostMapping("/sessions/{id}/complete") public ApiResponse<SessionView> complete(Authentication a,@PathVariable String id){return ApiResponse.ok(service.complete(a.getName(),id),"Quiz completed");}
    @GetMapping("/history") public ApiResponse<Page<SessionView>> history(Authentication a,@RequestParam(defaultValue="0")int page){return ApiResponse.ok(service.history(a.getName(),page),"Quiz history fetched");}
    @GetMapping("/insights") public ApiResponse<List<Insight>> insights(Authentication a){return ApiResponse.ok(service.insights(a.getName(),false),"Learning insights fetched");}
    @GetMapping("/revisions") public ApiResponse<List<Insight>> revisions(Authentication a){return ApiResponse.ok(service.insights(a.getName(),true),"Revision recommendations fetched");}
}

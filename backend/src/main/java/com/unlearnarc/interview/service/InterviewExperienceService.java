package com.unlearnarc.interview.service;

import com.unlearnarc.interview.dto.InterviewExperienceRequest;
import com.unlearnarc.interview.dto.InterviewExperienceResponse;
import com.unlearnarc.interview.entity.InterviewExperience;
import com.unlearnarc.interview.mapper.InterviewExperienceMapper;
import com.unlearnarc.interview.repository.InterviewExperienceRepository;
import com.unlearnarc.common.HtmlSanitizer;
import com.unlearnarc.user.entity.User;
import com.unlearnarc.user.repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class InterviewExperienceService {

    private final InterviewExperienceRepository repository;
    private final InterviewExperienceMapper mapper;
    private final UserRepository userRepository;
    private final HtmlSanitizer htmlSanitizer;

    /** Create a new experience owned by the given user (resolved from the JWT email). Starts unverified. */
    public InterviewExperienceResponse create(String authEmail, InterviewExperienceRequest request) {
        User user = getUserByEmail(authEmail);
        InterviewExperience entity = mapper.toEntity(request);
        // Authoritative server-side sanitization — never trust client-sent HTML.
        entity.setExperience(htmlSanitizer.sanitize(entity.getExperience()));
        entity.setUserId(user.getId());
        entity.setIsVerified(false);
        InterviewExperience saved = repository.save(entity);
        return toResponseWithAuthor(saved, user.getName());
    }

    /** Public feed — verified posts only. */
    @Transactional(readOnly = true)
    public List<InterviewExperienceResponse> findVerified() {
        return withAuthorNames(repository.findByIsVerifiedTrueOrderByCreatedAtDesc());
    }

    /** Public feed by company — verified posts only. */
    @Transactional(readOnly = true)
    public List<InterviewExperienceResponse> findVerifiedByCompany(String company) {
        return withAuthorNames(
                repository.findByIsVerifiedTrueAndCompanyIgnoreCaseOrderByCreatedAtDesc(company));
    }

    /** Admin — all posts (optionally filter by verification status). */
    @Transactional(readOnly = true)
    public List<InterviewExperienceResponse> findAllForAdmin(Boolean verified) {
        List<InterviewExperience> experiences = (verified == null)
                ? repository.findAllByOrderByCreatedAtDesc()
                : repository.findByIsVerifiedOrderByCreatedAtDesc(verified);
        return withAuthorNames(experiences);
    }

    @Transactional(readOnly = true)
    public List<InterviewExperienceResponse> findMine(String authEmail) {
        User user = getUserByEmail(authEmail);
        return withAuthorNames(repository.findByUserIdOrderByCreatedAtDesc(user.getId()));
    }

    @Transactional(readOnly = true)
    public InterviewExperienceResponse findById(String id) {
        InterviewExperience entity = getOrThrow(id);
        String authorName = userRepository.findById(entity.getUserId())
                .map(User::getName).orElse(null);
        return toResponseWithAuthor(entity, authorName);
    }

    /** Only the author (or an admin) may update. Editing resets verification so admins re-review changes. */
    public InterviewExperienceResponse update(String id, String authEmail, boolean isAdmin,
                                              InterviewExperienceRequest request) {
        InterviewExperience entity = getOrThrow(id);
        // The platform admin is a virtual account (see application.properties) with no user row,
        // so only resolve the acting user when ownership actually has to be checked.
        assertCanModify(entity, authEmail, isAdmin);
        mapper.updateEntity(request, entity);
        // Re-sanitize on every edit — the edited HTML is just as untrusted.
        entity.setExperience(htmlSanitizer.sanitize(entity.getExperience()));
        if (!isAdmin) {
            // A student editing their post sends it back to the moderation queue.
            entity.setIsVerified(false);
            entity.setVerifiedBy(null);
        }
        InterviewExperience saved = repository.save(entity);
        // Resolve the author (post owner) for the response — never the acting admin.
        String authorName = userRepository.findById(saved.getUserId())
                .map(User::getName).orElse(null);
        return toResponseWithAuthor(saved, authorName);
    }

    /** Admin-only — mark a post verified / unverified. */
    public InterviewExperienceResponse setVerified(String id, String adminEmail, boolean verified) {
        InterviewExperience entity = getOrThrow(id);
        // The platform admin is a virtual account (defined in application.properties) and is
        // intentionally NOT present in the user table. Resolve it leniently so moderation
        // never fails just because the acting principal has no user row.
        String verifiedBy = verified
                ? userRepository.findByEmail(adminEmail).map(User::getId).orElse(adminEmail)
                : null;
        entity.setIsVerified(verified);
        entity.setVerifiedBy(verifiedBy);
        InterviewExperience saved = repository.save(entity);
        String authorName = userRepository.findById(saved.getUserId())
                .map(User::getName).orElse(null);
        return toResponseWithAuthor(saved, authorName);
    }

    /** Only the author (or an admin) may delete. */
    public void delete(String id, String authEmail, boolean isAdmin) {
        InterviewExperience entity = getOrThrow(id);
        assertCanModify(entity, authEmail, isAdmin);
        repository.deleteById(id);
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private InterviewExperience getOrThrow(String id) {
        return repository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Interview experience not found: " + id));
    }

    private User getUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new EntityNotFoundException("User not found: " + email));
    }

    /**
     * Authorises a modify/delete action. Admins (virtual account, no user row) always pass.
     * For non-admins the acting user is resolved from the JWT email and must own the post.
     */
    private void assertCanModify(InterviewExperience entity, String authEmail, boolean isAdmin) {
        if (isAdmin) {
            return;
        }
        User user = getUserByEmail(authEmail);
        if (!entity.getUserId().equals(user.getId())) {
            throw new AccessDeniedException("You can only modify your own interview experience.");
        }
    }

    private InterviewExperienceResponse toResponseWithAuthor(InterviewExperience entity, String authorName) {
        InterviewExperienceResponse response = mapper.toResponse(entity);
        response.setAuthorName(authorName);
        return response;
    }

    /** Batch-resolve author names to avoid N+1 queries. */
    private List<InterviewExperienceResponse> withAuthorNames(List<InterviewExperience> experiences) {
        if (experiences.isEmpty()) {
            return List.of();
        }
        List<String> userIds = experiences.stream()
                .map(InterviewExperience::getUserId)
                .distinct()
                .toList();
        Map<String, String> idToName = userRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(User::getId, User::getName, (a, b) -> a));

        return experiences.stream()
                .map(e -> toResponseWithAuthor(e, idToName.get(e.getUserId())))
                .toList();
    }
}

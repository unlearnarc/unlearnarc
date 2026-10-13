package com.unlearnarc.topic.service;

import com.unlearnarc.course.repository.CourseRepository;
import com.unlearnarc.topic.dto.TopicRequest;
import com.unlearnarc.topic.dto.TopicResponse;
import com.unlearnarc.topic.entity.Topic;
import com.unlearnarc.topic.mapper.TopicMapper;
import com.unlearnarc.topic.repository.TopicRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class TopicService {

    private final TopicRepository topicRepository;
    private final CourseRepository courseRepository;
    private final TopicMapper topicMapper;

    public TopicResponse create(TopicRequest request) {
        if (!courseRepository.existsById(request.getCourseId())) {
            throw new EntityNotFoundException("Course not found: " + request.getCourseId());
        }
        if (topicRepository.existsByNameAndCourseId(request.getName(), request.getCourseId())) {
            throw new IllegalArgumentException("Topic already exists in this course: " + request.getName());
        }
        Topic topic = topicMapper.toEntity(request);
        return topicMapper.toResponse(topicRepository.save(topic));
    }

    @Transactional(readOnly = true)
    public List<TopicResponse> findAll() {
        return topicRepository.findAll().stream()
                .map(topicMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<TopicResponse> findByCourseId(String courseId) {
        return topicRepository.findByCourseIdOrderByTopicOrder(courseId).stream()
                .map(topicMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public TopicResponse findById(String id) {
        return topicMapper.toResponse(getOrThrow(id));
    }

    public TopicResponse update(String id, TopicRequest request) {
        Topic topic = getOrThrow(id);
        if (!courseRepository.existsById(request.getCourseId())) {
            throw new EntityNotFoundException("Course not found: " + request.getCourseId());
        }
        topicMapper.updateEntity(request, topic);
        return topicMapper.toResponse(topicRepository.save(topic));
    }

    public void delete(String id) {
        getOrThrow(id);
        topicRepository.deleteById(id);
    }

    private Topic getOrThrow(String id) {
        return topicRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Topic not found: " + id));
    }
}

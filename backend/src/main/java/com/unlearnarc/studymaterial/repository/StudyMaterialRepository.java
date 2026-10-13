package com.unlearnarc.studymaterial.repository;

import com.unlearnarc.studymaterial.entity.StudyMaterial;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface StudyMaterialRepository extends JpaRepository<StudyMaterial, String> {
    List<StudyMaterial> findByTopicId(String topicId);
    boolean existsByTopicIdAndUrl(String topicId, String url);
}

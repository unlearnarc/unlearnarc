package com.unlearnarc.course.mapper;

import com.unlearnarc.course.dto.CourseRequest;
import com.unlearnarc.course.dto.CourseResponse;
import com.unlearnarc.course.entity.Course;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface CourseMapper {

    Course toEntity(CourseRequest request);

    CourseResponse toResponse(Course course);

    void updateEntity(CourseRequest request, @MappingTarget Course course);
}

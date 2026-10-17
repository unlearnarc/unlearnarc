package com.unlearnarc.note.mapper;

import com.unlearnarc.note.dto.NoteRequest;
import com.unlearnarc.note.dto.NoteResponse;
import com.unlearnarc.note.dto.NoteSummaryResponse;
import com.unlearnarc.note.entity.Note;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface NoteMapper {

    // id / timestamps are managed by the entity + Hibernate, not the client.
    // contentHtml is sanitized in the service before save.
    @Mapping(target = "id",        ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    Note toEntity(NoteRequest request);

    NoteResponse toResponse(Note note);

    NoteSummaryResponse toSummary(Note note);

    @Mapping(target = "id",        ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    void updateEntity(NoteRequest request, @MappingTarget Note note);
}

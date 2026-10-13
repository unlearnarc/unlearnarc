package com.unlearnarc.domain.mapper;

import com.unlearnarc.domain.dto.DomainRequest;
import com.unlearnarc.domain.dto.DomainResponse;
import com.unlearnarc.domain.entity.Domain;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface DomainMapper {

    Domain toEntity(DomainRequest request);

    DomainResponse toResponse(Domain domain);

    void updateEntity(DomainRequest request, @MappingTarget Domain domain);
}

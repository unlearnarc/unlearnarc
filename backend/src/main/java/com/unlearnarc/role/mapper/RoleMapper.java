package com.unlearnarc.role.mapper;

import com.unlearnarc.role.dto.RoleRequest;
import com.unlearnarc.role.dto.RoleResponse;
import com.unlearnarc.role.entity.Role;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface RoleMapper {

    @Mapping(target = "id", ignore = true)
    Role toEntity(RoleRequest request);

    RoleResponse toResponse(Role entity);

    @Mapping(target = "id", ignore = true)
    void updateEntity(RoleRequest request, @MappingTarget Role entity);
}

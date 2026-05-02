if(NOT TARGET hermes-engine::libhermes)
add_library(hermes-engine::libhermes SHARED IMPORTED)
set_target_properties(hermes-engine::libhermes PROPERTIES
    IMPORTED_LOCATION "C:/Users/Mega-PC/.gradle/caches/8.11.1/transforms/8d4ff158e8c3d9f7b9cc70fe4be34fa5/transformed/hermes-android-0.79.2-debug/prefab/modules/libhermes/libs/android.arm64-v8a/libhermes.so"
    INTERFACE_INCLUDE_DIRECTORIES "C:/Users/Mega-PC/.gradle/caches/8.11.1/transforms/8d4ff158e8c3d9f7b9cc70fe4be34fa5/transformed/hermes-android-0.79.2-debug/prefab/modules/libhermes/include"
    INTERFACE_LINK_LIBRARIES ""
)
endif()


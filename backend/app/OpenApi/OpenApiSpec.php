<?php

namespace App\OpenApi;

use OpenApi\Annotations as OA;

/**
 * @OA\Info(
 *     title="Nông Lành - API thương mại điện tử nông sản sạch",
 *     version="1.0.0",
 *     description="Tài liệu RESTful API của hệ thống Nông Lành. Các endpoint có bảo vệ yêu cầu JWT trong header Authorization: Bearer <token>."
 * )
 *
 * @OA\Server(
 *     url="http://127.0.0.1:8000",
 *     description="Máy chủ phát triển Laravel"
 * )
 *
 * @OA\SecurityScheme(
 *     securityScheme="bearerAuth",
 *     type="http",
 *     scheme="bearer",
 *     bearerFormat="JWT",
 *     description="Nhập JWT access token nhận được từ endpoint đăng nhập."
 * )
 */
class OpenApiSpec {}

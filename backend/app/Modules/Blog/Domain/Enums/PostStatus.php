<?php

namespace App\Modules\Blog\Domain\Enums;

enum PostStatus: string
{
    case Draft = 'draft';
    case Published = 'published';
}

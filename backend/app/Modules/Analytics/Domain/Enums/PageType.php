<?php

namespace App\Modules\Analytics\Domain\Enums;

enum PageType: string
{
    case Home = 'home';
    case PropertyListing = 'property_listing';
    case Property = 'property';
    case Blog = 'blog';
    case BlogPost = 'blog_post';
    case Contact = 'contact';
    case About = 'about';
    case Services = 'services';
    case Partner = 'partner';
    case Other = 'other';
}

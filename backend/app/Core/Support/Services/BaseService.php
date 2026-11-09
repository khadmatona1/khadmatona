<?php

namespace App\Core\Support\Services;

/**
 * Optional common ancestor for Application-layer services. Not every
 * module needs one - a module with no business logic beyond CRUD
 * should just use its repository directly from the controller rather
 * than adding an empty Service class for symmetry.
 */
abstract class BaseService
{
    //
}

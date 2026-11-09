<?php

namespace App\Modules\Rental\Http\Controllers;

use App\Core\Support\Http\ApiResponse;
use App\Modules\Rental\Application\RentalOperationsService;
use App\Modules\Rental\Domain\Models\Expense;
use App\Modules\Rental\Http\Controllers\Concerns\RespondsWithPages;
use App\Modules\Rental\Http\Filters\ExpenseFilter;
use App\Modules\Rental\Http\Requests\StoreExpenseRequest;
use App\Modules\Rental\Http\Requests\UpdateExpenseRequest;
use App\Modules\Rental\Http\Resources\ExpenseResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ExpenseController
{
    use RespondsWithPages;

    public function __construct(private readonly RentalOperationsService $operations) {}

    public function index(Request $request, ExpenseFilter $filter): JsonResponse
    {
        return $this->page($filter->apply()->paginate($this->perPage($request)), ExpenseResource::class);
    }

    public function store(StoreExpenseRequest $request): JsonResponse
    {
        return ApiResponse::success(new ExpenseResource($this->operations->createExpense($request->toModelAttributes())), status: 201);
    }

    public function update(UpdateExpenseRequest $request, Expense $expense): JsonResponse
    {
        return ApiResponse::success(new ExpenseResource($this->operations->updateExpense($expense, $request->toModelAttributes())));
    }

    public function destroy(Expense $expense): JsonResponse
    {
        $this->operations->deleteExpense($expense);

        return ApiResponse::success();
    }
}

<?php

use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->user = User::factory()->create();
    $this->role = Role::create(['name' => 'test-role', 'guard_name' => 'web']);
    $this->permission = Permission::create(['name' => 'test-permission', 'guard_name' => 'web']);
    
    $this->actingAs($this->user);
});

it('can sync user roles successfully', function () {
    $response = $this->post('/role-permission/sync-user-roles', [
        'user_id' => $this->user->id,
        'roles' => [$this->role->id]
    ]);

    $response->assertRedirect();
    expect($this->user->fresh()->hasRole('test-role'))->toBeTrue();
});

it('can sync user direct permissions successfully', function () {
    $response = $this->post('/role-permission/sync-user-direct-permissions', [
        'user_id' => $this->user->id,
        'permissions' => [$this->permission->id]
    ]);

    $response->assertRedirect();
    expect($this->user->fresh()->hasPermissionTo('test-permission'))->toBeTrue();
});

it('can remove user roles', function () {
    $this->user->assignRole('test-role');
    
    $response = $this->post('/role-permission/sync-user-roles', [
        'user_id' => $this->user->id,
        'roles' => []
    ]);

    $response->assertRedirect();
    expect($this->user->fresh()->hasRole('test-role'))->toBeFalse();
});

it('can remove user direct permissions', function () {
    $this->user->givePermissionTo('test-permission');
    
    $response = $this->post('/role-permission/sync-user-direct-permissions', [
        'user_id' => $this->user->id,
        'permissions' => []
    ]);

    $response->assertRedirect();
    expect($this->user->fresh()->hasPermissionTo('test-permission'))->toBeFalse();
});

it('validates required user_id field', function () {
    $response = $this->post('/role-permission/sync-user-roles', [
        'roles' => [$this->role->id]
    ]);

    $response->assertSessionHasErrors(['user_id']);
});

it('validates that user exists', function () {
    $response = $this->post('/role-permission/sync-user-roles', [
        'user_id' => 99999,
        'roles' => [$this->role->id]
    ]);

    $response->assertSessionHasErrors(['user_id']);
});
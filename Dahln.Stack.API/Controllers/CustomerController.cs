using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Dahln.Stack.API.Utility;
using Dahln.Stack.Database;
using Microsoft.EntityFrameworkCore;
using System.Net;
using Dahln.Stack.Service;

namespace Dahln.Stack.API.Controllers;

[ApiController]
public class CustomerController : Controller
{
    private CustomerService _customerService;
    public CustomerController(CustomerService customerService) 
    {
        _customerService = customerService;
    }

    [Authorize]
    [HttpPost]
    [Route("api/v1/customer")]
    [ProducesResponseType<string>(StatusCodes.Status200OK)]
    [ProducesResponseType<string>(StatusCodes.Status400BadRequest)]
    async public Task<IActionResult> CustomerCreate([FromBody] Dto.Customer model)
    {
        string userId = User.GetUserId();

        if (string.IsNullOrEmpty(model.Name))
        {
            return BadRequest("Customer name is required");
        }

        var result = await _customerService.CreateCustomerAsync(model, userId);

        return Ok(result);
    }

    [Authorize]
    [HttpGet]
    [Route("api/v1/customer/{customerId}")]
    [ProducesResponseType<Dto.Customer>(StatusCodes.Status200OK)]
    [ProducesResponseType<string>(StatusCodes.Status400BadRequest)]
    async public Task<IActionResult> CustomerGetById(string customerId)
    {
        string userId = User.GetUserId();

        var response = await _customerService.GetCustomerAsync(customerId, userId);

        if (response == null)
            return BadRequest("Customer not found");

        return Ok(response);
    }

    [Authorize]
    [HttpPut]
    [Route("api/v1/customer/{customerId}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType<string>(StatusCodes.Status400BadRequest)]
    async public Task<IActionResult> CustomerUpdateById([FromBody] Dto.Customer model, string customerId)
    {
        string userId = User.GetUserId();

        if (string.IsNullOrEmpty(model.Name))
        {
            return BadRequest("Customer name is required");
        }

        var update = await _customerService.UpdateCustomer(model, userId);
        if (update)
            return Ok();
        else
            return BadRequest("Customer update failed");
    }

    [Authorize]
    [HttpDelete]
    [Route("api/v1/customer/{customerId}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType<string>(StatusCodes.Status400BadRequest)]
    async public Task<IActionResult> CustomerDeleteById(string customerId)
    {
        string userId = User.GetUserId();

        var deleted = await _customerService.DeleteCustomerByIdAsync(customerId, userId);
        
        if(deleted)
            return Ok();
        else
            return BadRequest("Customer delete failed");
    }


    [Authorize]
    [HttpPost]
    [Route("api/v1/customers")]
    [ProducesResponseType<Dto.SearchResponse<Dto.Customer>>(StatusCodes.Status200OK)]
    async public Task<IActionResult> CustomerSearch([FromBody] Dto.Search model)
    {
        string userId = User.GetUserId();

        var response = await _customerService.SearchCustomersAsync(model, userId);

        return Ok(response);
    }



    [HttpGet]
    [Authorize]
    [Route("api/v1/seed/customers/{number}")]
    async public Task<IActionResult> SeedCustomers(int number)
    {
        string userId = User.GetUserId();

        await _customerService.SeedCustomers(number, userId);

        return Ok();
    }
}



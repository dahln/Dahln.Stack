using System.Web;
using Dahln.Stack.Database;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.UI.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Smtp2Go.Api;
using Smtp2Go.Api.Models.Emails;

namespace Dahln.Stack.API.Utility;

//The details in this github issue where helpful.
//https://github.com/dotnet/aspnetcore/issues/50298

internal sealed class EmailSender : IEmailSender<IdentityUser>
{
    private readonly ILogger _logger;
    private IHttpContextAccessor _httpContextAccessor;
    private readonly IServiceScopeFactory _scopeFactory;


    public EmailSender(ILogger<EmailSender> logger, IHttpContextAccessor httpContextAccessor, IServiceScopeFactory serviceScopeFactory)
    {
        _logger = logger;
        _httpContextAccessor = httpContextAccessor;
        _scopeFactory = serviceScopeFactory;
    }

    private async Task SendEmailAsync(string toEmail, string subject, string message)
    {
        await SendEmailAsync(toEmail, subject, message, message);
    }

    private async Task SendEmailAsync(string toEmail, string subject, string htmlMessage, string plainMessage)
    {
        // Create a scope to get a scoped instance of ApplicationDbContext
        using (var scope = _scopeFactory.CreateScope())
        {
            var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var settings = await dbContext.SystemSettings.FirstOrDefaultAsync();

            if (string.IsNullOrEmpty(settings.EmailApiKey))
            {
                return;
            }

            if (string.IsNullOrEmpty(settings.SystemEmailAddress))
            {
                return;
            }
            await Execute(settings.EmailApiKey, settings.SystemEmailAddress, subject, htmlMessage, plainMessage, toEmail);
        }
    }

    private async Task Execute(string apiKey, string fromEmail, string subject, string message, string toEmail)
    {
        await Execute(apiKey, fromEmail, subject, message, message, toEmail);
    }

    private async Task Execute(string apiKey, string fromEmail, string subject, string htmlMessage, string plainMessage, string toEmail)
    {
        if (string.IsNullOrEmpty(apiKey))
        {
            return;
        }

        if (string.IsNullOrEmpty(fromEmail))
        {
            return;
        }

        var service = new Smtp2GoApiService(apiKey);
        var emailMessage = new EmailMessage(fromEmail, toEmail)
        {
            Subject = subject,
            BodyText = plainMessage,
            BodyHtml = htmlMessage
        };

        // Add headers to improve deliverability
        emailMessage.AddCustomHeader("X-Mailer", "Dahln.Stack Application");
        emailMessage.AddCustomHeader("List-Unsubscribe", $"<mailto:{fromEmail}?subject=Unsubscribe>");

        var response = await service.SendEmail(emailMessage);
        var redactedToEmail = RedactEmailForLog(toEmail);
        _logger.LogInformation(response.Data?.Error == null
                               ? $"Email to {redactedToEmail} queued successfully!"
                               : $"Failure Email to {redactedToEmail}: {response.Data.Error}");
    }

    private static string RedactEmailForLog(string email)
    {
        if (string.IsNullOrWhiteSpace(email))
        {
            return "[redacted]";
        }

        var atIndex = email.IndexOf('@');
        if (atIndex <= 0 || atIndex == email.Length - 1)
        {
            return "[redacted]";
        }

        var localPart = email.Substring(0, atIndex);
        var domainPart = email.Substring(atIndex);
        var visibleLocal = localPart.Length > 1 ? localPart.Substring(0, 1) : "*";
        return $"{visibleLocal}***{domainPart}";
    }

    //This is the stock method.
    // public Task SendConfirmationLinkAsync(IdentityUser user, string email, string confirmationLink) =>
    //     SendEmailAsync(email, "Confirm your email", $"Please confirm your account by <a href='{confirmationLink}'>clicking here</a>. Thank you.");
    public Task SendConfirmationLinkAsync(IdentityUser user, string email, string confirmationLink)
    {
        //Adjust the confirmEmail link to use a link in the App, instead of in the API. Keeps the user flow in the App.
        Uri confirmationLinkUri = new Uri(confirmationLink);
        var adjustedUrlForApp = confirmationLinkUri.PathAndQuery.Replace("confirmEmail", "confirmingEmail");
        var hostUrl = _httpContextAccessor.HttpContext.Request.Host.Value;

        Uri adjustedConfirmationLink = new Uri($"https://{hostUrl}{adjustedUrlForApp}");


        if (adjustedConfirmationLink.Query.Contains("changedEmail="))
        {
            var htmlMessage = $@"
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset='utf-8'>
                    <title>Confirm Your Email Change</title>
                </head>
                <body style='font-family: Arial, sans-serif; line-height: 1.6; color: #333;'>
                    <div style='max-width: 600px; margin: 0 auto; padding: 20px;'>
                        <h2 style='color: #2c3e50;'>Email Address Changed</h2>
                        <p>You have changed your email address for your Dahln.Stack account.</p>
                        <p>Please confirm your new email address by clicking the button below:</p>
                        <div style='text-align: center; margin: 30px 0;'>
                            <a href='{adjustedConfirmationLink}' style='background-color: #3498db; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;'>Confirm Email Change</a>
                        </div>
                        <p><strong>If you did not request this email change, please disregard this email.</strong></p>
                        <hr style='margin: 30px 0; border: none; border-top: 1px solid #eee;'>
                        <p style='font-size: 12px; color: #666;'>This email was sent by Dahln.Stack. If you have questions, please contact support.</p>
                    </div>
                </body>
                </html>";
            var plainMessage = $"You have changed your email. Please confirm your new email by visiting: {adjustedConfirmationLink}. If you did not request an email change, disregard this email. Thank you.";
            return SendEmailAsync(email, "Confirm your changed email", htmlMessage, plainMessage);
        }
        else
        {
            var htmlMessage = $@"
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset='utf-8'>
                    <title>Confirm Your Account</title>
                </head>
                <body style='font-family: Arial, sans-serif; line-height: 1.6; color: #333;'>
                    <div style='max-width: 600px; margin: 0 auto; padding: 20px;'>
                        <h2 style='color: #2c3e50;'>Welcome to Dahln.Stack!</h2>
                        <p>Thank you for creating your account. To get started, please confirm your email address.</p>
                        <div style='text-align: center; margin: 30px 0;'>
                            <a href='{adjustedConfirmationLink}' style='background-color: #27ae60; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;'>Confirm Account</a>
                        </div>
                        <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
                        <p style='word-break: break-all; color: #3498db;'>{adjustedConfirmationLink}</p>
                        <hr style='margin: 30px 0; border: none; border-top: 1px solid #eee;'>
                        <p style='font-size: 12px; color: #666;'>This email was sent by Dahln.Stack. If you have questions, please contact support.</p>
                    </div>
                </body>
                </html>";
            var plainMessage = $"Please confirm your account by visiting: {adjustedConfirmationLink}. Thank you.";
            return SendEmailAsync(email, "Confirm your email", htmlMessage, plainMessage);
        }
    }


    public Task SendPasswordResetLinkAsync(IdentityUser user, string email, string resetLink)
    {
        var htmlMessage = $@"
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset='utf-8'>
                <title>Reset Your Password</title>
            </head>
            <body style='font-family: Arial, sans-serif; line-height: 1.6; color: #333;'>
                <div style='max-width: 600px; margin: 0 auto; padding: 20px;'>
                    <h2 style='color: #2c3e50;'>Password Reset Request</h2>
                    <p>We received a request to reset your password for your Dahln.Stack account.</p>
                    <div style='text-align: center; margin: 30px 0;'>
                        <a href='{resetLink}' style='background-color: #e74c3c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;'>Reset Password</a>
                    </div>
                    <p>If you didn't request this password reset, you can safely ignore this email.</p>
                    <p>This link will expire in 24 hours for security reasons.</p>
                    <hr style='margin: 30px 0; border: none; border-top: 1px solid #eee;'>
                    <p style='font-size: 12px; color: #666;'>This email was sent by Dahln.Stack. If you have questions, please contact support.</p>
                </div>
            </body>
            </html>";
        var plainMessage = $"Please reset your password by visiting: {resetLink}";
        return SendEmailAsync(email, "Reset your password", htmlMessage, plainMessage);
    }

    public Task SendPasswordResetCodeAsync(IdentityUser user, string email, string resetCode)
    {
        var resetLink = $"https://{_httpContextAccessor.HttpContext.Request.Host.Value}/password/reset/{resetCode}";
        var htmlMessage = $@"
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset='utf-8'>
                <title>Password Reset Code</title>
            </head>
            <body style='font-family: Arial, sans-serif; line-height: 1.6; color: #333;'>
                <div style='max-width: 600px; margin: 0 auto; padding: 20px;'>
                    <h2 style='color: #2c3e50;'>Password Reset</h2>
                    <p>Use the link below to reset your password for your Dahln.Stack account:</p>
                    <div style='text-align: center; margin: 30px 0;'>
                        <a href='{resetLink}' style='background-color: #e74c3c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;'>Reset Password</a>
                    </div>
                    <p>If you didn't request this password reset, you can safely ignore this email.</p>
                    <hr style='margin: 30px 0; border: none; border-top: 1px solid #eee;'>
                    <p style='font-size: 12px; color: #666;'>This email was sent by Dahln.Stack. If you have questions, please contact support.</p>
                </div>
            </body>
            </html>";
        var plainMessage = $"Please reset your password using the following link: {resetLink}";
        return SendEmailAsync(email, "Reset your password", htmlMessage, plainMessage);
    }
}




